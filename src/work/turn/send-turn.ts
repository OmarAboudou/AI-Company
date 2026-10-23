import { runOperation } from "../../git/reserved-branch/run-operation.ts"
import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import { loadJournal } from "../../journal/storage.ts"
import type { AssistantTurn, UserTurn } from "../../llm/conversation/schema.ts"
import { UserError } from "../../user-error.ts"
import { applyAssistantTurn } from "../run/apply-assistant-turn.ts"
import { endTask } from "../run/end-task.ts"
import { loadCancellationReason } from "../run/load-cancellation-reason.ts"
import { requireRunTools } from "../run/require-run-tools.ts"
import type { RunWorker, TaskEnding } from "../tool/define-tool.ts"
import { builtInWorkCatalog, type WorkCatalog } from "../work-catalog.ts"
import { requireRunInProgress } from "./require-run-in-progress.ts"
import { deleteStagedTurn, loadStagedTurn } from "./storage.ts"

export type SendTurnResult = {
    sentTurn: AssistantTurn
    answeringTurn?: UserTurn
    taskEnding?: TaskEnding
}

export type TurnSending = {
    catalog?: WorkCatalog
    shouldEndSession?: boolean
}

export async function sendTurn(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    operationName: string,
    {
        catalog = builtInWorkCatalog,
        shouldEndSession = false,
    }: TurnSending = {},
): Promise<SendTurnResult> {
    const journal = await loadJournal(projectRoot)
    const { task, position, run } = await requireRunInProgress(
        journal,
        environment,
    )
    const { blocks } = await loadStagedTurn(projectRoot, run.id)
    if (blocks.length === 0 && !shouldEndSession) {
        throw new UserError(
            "Your turn is empty: add to it with `aico turn add text` or `aico turn add tool`.",
        )
    }
    if (shouldEndSession && blocks.some(({ type }) => type === "tool-call")) {
        throw new UserError(
            "Your turn calls tools: send it first, or clear it, to end your session.",
        )
    }
    const tools = requireRunTools(run.session)
    const { depth } = requireJournalEvent(journal, task.causeEventId)
    const worker: RunWorker = { kind: "directors" }
    const sentTurn: AssistantTurn = { role: "assistant", blocks }
    // Emptied before its tools run: a crash among them must not let the
    // person send the same turn, and its messages, a second time.
    await deleteStagedTurn(projectRoot, run.id)
    const { answeringTurn, taskEnding } = await applyAssistantTurn(
        run,
        sentTurn,
        {
            tools,
            ctx: {
                projectRoot,
                journal,
                task,
                depth,
                position,
                worker,
                runId: run.id,
            },
            loadCancellationReason: () =>
                loadCancellationReason(journal, {
                    task,
                    position,
                    taskTypes: catalog.taskTypes,
                }),
        },
    )
    if (taskEnding !== undefined) {
        const sessionResult = run.session.result
        await runOperation(projectRoot, operationName, () =>
            endTask(
                journal,
                {
                    task,
                    position,
                    runId: run.id,
                    depth,
                    sessionResult,
                    taskTypes: catalog.taskTypes,
                },
                taskEnding,
            ),
        )
    }
    return { sentTurn, answeringTurn, taskEnding }
}
