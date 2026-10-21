import { recordEvent } from "../../journal/record-event.ts"
import type { Journal, JournalEvent } from "../../journal/schema.ts"
import { createTaskId } from "./create-task-id.ts"
import { getWithSortedKeys } from "./get-with-sorted-keys.ts"
import {
    type Task,
    taskCreatedEventType,
    type UncreatedTask,
} from "./schema.ts"
import { saveTask } from "./storage.ts"

export async function createTask(
    journal: Journal,
    { type, positionId, params }: UncreatedTask,
    causeEvent: JournalEvent,
): Promise<Task> {
    const task = {
        id: createTaskId(causeEvent.id, { type, positionId, params }),
        askedAt: causeEvent.occurredAt,
        type,
        params: getWithSortedKeys(params),
        positionId,
        causeEventId: causeEvent.id,
    }
    // The task comes first: should the creation stop in between, dispatching
    // its cause again finds the task and doesn't create it twice. The other
    // way round, it would find no task, and leave a task-created naming none.
    await saveTask(journal.projectRoot, task)
    await recordEvent(journal, taskCreatedEventType, {
        depth: causeEvent.depth + 1,
        taskId: task.id,
    })
    return task
}
