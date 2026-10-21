import {
    type AnthropicMessagesCall,
    callAnthropicMessages,
} from "../../llm/anthropic-messages/call-anthropic-messages.ts"
import type {
    Conversation,
    ConversationTurn,
    TokenUsage,
    ToolCallBlock,
    ToolResultBlock,
    TurnStop,
} from "../../llm/conversation/schema.ts"
import type { TaskEnding, Tool, ToolContext } from "../tool/define-tool.ts"
import { getToolDefinitions } from "../tool/get-tool-definitions.ts"
import { runToolCall } from "../tool/run-tool-call.ts"
import type { RunProgress } from "./schema.ts"
import { appendRunTranscriptLine } from "./storage.ts"

export type ToolLoop = Pick<
    AnthropicMessagesCall,
    "connection" | "apiKey" | "apiId"
> & {
    ctx: ToolContext
    systemPrompt: string
    userMessage: string
    tools: Record<string, Tool>
    onProgress: (progress: RunProgress) => void
}

export type RunToolLoopResult = { taskEnding: TaskEnding; usage: TokenUsage }

export const reminderText =
    "You ended your turn without calling a tool, and only tools act: what you write outside them reaches no one. Call task_mark-as-done with a summary if your task is done, or task_mark-as-failed with the reason if you can't do it."

// Settings (#35) will let management choose it.
export const maxToolCallsPerRun = 50

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

function addUsage(usage: TokenUsage, addedUsage: TokenUsage): TokenUsage {
    return {
        inputTokens: usage.inputTokens + addedUsage.inputTokens,
        outputTokens: usage.outputTokens + addedUsage.outputTokens,
        cacheReadInputTokens:
            usage.cacheReadInputTokens + addedUsage.cacheReadInputTokens,
        cacheCreationInputTokens:
            usage.cacheCreationInputTokens +
            addedUsage.cacheCreationInputTokens,
    }
}

async function runToolCalls(
    toolCalls: ToolCallBlock[],
    { tools, ctx, onProgress }: ToolLoop,
) {
    const toolResults: ToolResultBlock[] = []
    let taskEnding: TaskEnding | undefined
    for (const { id, name, input } of toolCalls) {
        onProgress({ kind: "tool-call", name, input })
        const result = await runToolCall(tools, { name, input }, ctx)
        onProgress({ kind: "tool-result", name, ...result })
        toolResults.push({
            type: "tool-result",
            toolCallId: id,
            text: result.text,
            isError: result.isError,
        })
        taskEnding ??= result.taskEnding
    }
    return { toolResults, taskEnding }
}

export async function runToolLoop(loop: ToolLoop): Promise<RunToolLoopResult> {
    const { ctx, connection, apiKey, apiId, onProgress } = loop
    const conversation: Conversation = {
        systemPrompt: loop.systemPrompt,
        tools: getToolDefinitions(loop.tools),
        turns: [],
    }
    let usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
    }
    let hasBeenReminded = false
    let toolCallCount = 0
    async function addTurn(turn: ConversationTurn) {
        conversation.turns.push(turn)
        await appendRunTranscriptLine(ctx.projectRoot, ctx.runId, {
            type: "turn",
            ...turn,
        })
    }
    await appendRunTranscriptLine(ctx.projectRoot, ctx.runId, {
        type: "start",
        apiId,
        systemPrompt: conversation.systemPrompt,
        tools: conversation.tools,
    })
    await addTurn({
        role: "user",
        blocks: [{ type: "text", text: loop.userMessage }],
    })
    while (true) {
        const modelTurn = await callAnthropicMessages({
            connection,
            apiKey,
            apiId,
            conversation,
            onText: (text) => onProgress({ kind: "text", text }),
        })
        await addTurn(modelTurn)
        const { modelResponse } = modelTurn
        usage = addUsage(usage, modelResponse.usage)
        // A refusal or a cut can stop a tool call halfway through its input,
        // so none of this turn's calls runs.
        const stopFailureReason = getStopFailureReason(modelResponse.stop)
        if (stopFailureReason !== undefined) {
            return {
                taskEnding: { state: "failed", reason: stopFailureReason },
                usage,
            }
        }
        const toolCalls = modelTurn.blocks.filter(
            (block) => block.type === "tool-call",
        )
        if (toolCallCount + toolCalls.length > maxToolCallsPerRun) {
            const reason = `The run went beyond ${maxToolCallsPerRun} tool calls without ending its task.`
            return { taskEnding: { state: "failed", reason }, usage }
        }
        toolCallCount += toolCalls.length
        if (toolCalls.length === 0) {
            if (hasBeenReminded) {
                const reason =
                    "The model ended two turns without calling a tool, the second after a reminder."
                return { taskEnding: { state: "failed", reason }, usage }
            }
            hasBeenReminded = true
            onProgress({ kind: "reminder", text: reminderText })
            await addTurn({
                role: "user",
                blocks: [{ type: "text", text: reminderText }],
            })
            continue
        }
        const { toolResults, taskEnding } = await runToolCalls(toolCalls, loop)
        await addTurn({ role: "user", blocks: toolResults })
        if (taskEnding !== undefined) {
            return { taskEnding, usage }
        }
    }
}
