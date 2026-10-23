import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import { loadJournal } from "../../journal/storage.ts"
import type { AssistantTurn, UserTurn } from "../../llm/conversation/schema.ts"
import { UserError } from "../../user-error.ts"
import { applyAssistantTurn } from "../run/apply-assistant-turn.ts"
import { endTask } from "../run/end-task.ts"
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

export async function sendTurn(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    catalog: WorkCatalog = builtInWorkCatalog,
): Promise<SendTurnResult> {
    const journal = await loadJournal(projectRoot)
    const { human, task, position, run } = await requireRunInProgress(
        journal,
        environment,
    )
    const { blocks } = await loadStagedTurn(projectRoot, run.id)
    if (blocks.length === 0) {
        throw new UserError(
            "Your turn is empty: add to it with `aico turn add text` or `aico turn add tool`.",
        )
    }
    const tools = requireRunTools(run.session)
    const { depth } = requireJournalEvent(journal, task.causeEventId)
    const worker: RunWorker =
        human.kind === "employee"
            ? { kind: "employee", employee: human.employee }
            : { kind: "directors" }
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
        },
    )
    if (taskEnding !== undefined) {
        const sessionResult = run.session.result
        await endTask(
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
        )
    }
    return { sentTurn, answeringTurn, taskEnding }
}
