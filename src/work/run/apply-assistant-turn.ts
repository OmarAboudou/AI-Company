import { runOperation } from "../../git/reserved-branch/run-operation.ts"
import type {
    AssistantTurn,
    ConversationTurn,
    ToolCallBlock,
    ToolResultBlock,
    TurnStop,
    UserTurn,
} from "../../llm/conversation/schema.ts"
import type { TaskEnding, Tool, ToolContext } from "../tool/define-tool.ts"
import { runToolCall } from "../tool/run-tool-call.ts"
import type { Run, RunProgress } from "./schema.ts"
import { sendSessionText } from "./send-session-text.ts"
import { appendRunTranscriptLine } from "./storage.ts"

// Settings (#35) will let management choose it.
export const maxToolCallsPerRun = 50

export type TurnApplication = {
    tools: Record<string, Tool>
    ctx: ToolContext
    onProgress?: (progress: RunProgress) => void
    loadCancellationReason?: () => Promise<string | undefined>
}

type TurnAnswer = { answeringTurn?: UserTurn; taskEnding?: TaskEnding }

export type ApplyAssistantTurnResult = TurnAnswer & { run: Run }

function getToolCalls(turn: AssistantTurn): ToolCallBlock[] {
    return turn.blocks.filter((block) => block.type === "tool-call")
}

function getStopFailureReason(stop: TurnStop): string | undefined {
    switch (stop.reason) {
        case "refusal":
            return `The model's provider declined to go on (refusal${stop.category ? `, ${stop.category}` : ""}).`
        case "max-length":
            return "The model's turn was cut at its maximum length."
        case "context-window-exceeded":
            return "The run's conversation outgrew the model's context window."
        case "end":
            return undefined
    }
}

function getFailureReason(
    previousTurns: ConversationTurn[],
    turn: AssistantTurn,
): string | undefined {
    // A refusal or a cut can stop a tool call halfway through its input,
    // so none of this turn's calls runs.
    const stopFailureReason =
        turn.modelResponse && getStopFailureReason(turn.modelResponse.stop)
    if (stopFailureReason !== undefined) {
        return stopFailureReason
    }
    const previousAssistantTurns = previousTurns.filter(
        (previousTurn) => previousTurn.role === "assistant",
    )
    const toolCallCount = [...previousAssistantTurns, turn].flatMap(
        getToolCalls,
    ).length
    if (toolCallCount > maxToolCallsPerRun) {
        return `The run went beyond ${maxToolCallsPerRun} tool calls without ending its task.`
    }
    return undefined
}

function createUnrunResult(
    { id }: ToolCallBlock,
    unrunReason: string,
): ToolResultBlock {
    return {
        type: "tool-result",
        toolCallId: id,
        text: `Not run: ${unrunReason}`,
        isError: true,
    }
}

// Texts join the ticket's discussion and calls run in the turn's order,
// so that a text written before an act is read before it.
async function applyBlocks(
    { blocks }: AssistantTurn,
    { tools, ctx, onProgress, loadCancellationReason }: TurnApplication,
) {
    const toolResults: ToolResultBlock[] = []
    let taskEnding: TaskEnding | undefined
    let unrunReason: string | undefined
    for (const block of blocks) {
        if (block.type === "text") {
            if (taskEnding?.state !== "cancelled") {
                await sendSessionText(block.text, ctx)
            }
            continue
        }
        const cancellationReason =
            unrunReason === undefined
                ? await loadCancellationReason?.()
                : undefined
        if (cancellationReason !== undefined) {
            taskEnding ??= { state: "cancelled", reason: cancellationReason }
            unrunReason = `the task was cancelled. ${cancellationReason}`
        }
        if (unrunReason !== undefined) {
            toolResults.push(createUnrunResult(block, unrunReason))
            continue
        }
        const { id, name, input } = block
        onProgress?.({ kind: "tool-call", name, input })
        const operationName = `${name} in task ${ctx.task.id}`
        const { text, isError, ...result } = await runOperation(
            ctx.projectRoot,
            operationName,
            () => runToolCall(tools, { name, input }, ctx),
        )
        onProgress?.({ kind: "tool-result", name, text, isError })
        toolResults.push({ type: "tool-result", toolCallId: id, text, isError })
        taskEnding ??= result.taskEnding
        if (result.hasPassedHand) {
            taskEnding ??= { state: "done", hasPassedHand: true }
            unrunReason = `you passed the hand with ${name}, which ended your session.`
        }
    }
    return { toolResults, taskEnding }
}

async function answerTurn(
    previousTurns: ConversationTurn[],
    turn: AssistantTurn,
    application: TurnApplication,
): Promise<TurnAnswer> {
    const failureReason = getFailureReason(previousTurns, turn)
    if (failureReason !== undefined) {
        return { taskEnding: { state: "failed", reason: failureReason } }
    }
    const { toolResults, taskEnding } = await applyBlocks(turn, application)
    // Whoever works the task stopped without passing the hand: the session
    // ends, and someone resumes the ticket in a later one.
    if (getToolCalls(turn).length === 0) {
        return { taskEnding: { state: "done", hasPassedHand: false } }
    }
    return { answeringTurn: { role: "user", blocks: toolResults }, taskEnding }
}

export async function applyAssistantTurn(
    run: Run,
    turn: AssistantTurn,
    application: TurnApplication,
): Promise<ApplyAssistantTurnResult> {
    const { projectRoot } = application.ctx
    const { conversation } = run
    await appendRunTranscriptLine(projectRoot, run.id, {
        type: "turn",
        ...turn,
    })
    const { answeringTurn, taskEnding } = await answerTurn(
        conversation.turns,
        turn,
        application,
    )
    if (answeringTurn !== undefined) {
        await appendRunTranscriptLine(projectRoot, run.id, {
            type: "turn",
            ...answeringTurn,
        })
    }
    const turns = [
        ...conversation.turns,
        turn,
        ...(answeringTurn === undefined ? [] : [answeringTurn]),
    ]
    return {
        run: { ...run, conversation: { ...conversation, turns } },
        answeringTurn,
        taskEnding,
    }
}
