import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { refreshJournal } from "../../journal/storage.ts"
import type { Position } from "../../organization/position/schema.ts"
import type { Task } from "../task/schema.ts"
import type { TaskType } from "../task-type/define-task-type.ts"
import { parseTaskParams } from "../task-type/parse-task-params.ts"

export type TaskCheck = {
    task: Task
    position: Position
    taskTypes: Record<string, TaskType>
}

// Another process, a person's terminal for one, may have changed what the
// task is for since the journal was read. A task of a type this version
// of AICo doesn't know can't be found pointless: its run goes on.
export async function loadCancellationReason(
    journal: Journal,
    { task, position, taskTypes }: TaskCheck,
): Promise<string | undefined> {
    const taskType = taskTypes[task.type]
    if (taskType?.getCancellationReason === undefined) {
        return undefined
    }
    await refreshJournal(journal)
    const params = parseTaskParams(task, taskType)
    const causeEvent = requireJournalEvent(journal, task.causeEventId)
    const { projectRoot } = journal
    const ctx = { projectRoot, journal, task, position, causeEvent }
    return taskType.getCancellationReason(params, ctx)
}
