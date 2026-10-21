import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { readMonotonicTime } from "../../read-monotonic-time.ts"
import { type NewTask, type Task, taskCreatedEventType } from "./schema.ts"
import { saveTask } from "./storage.ts"

export async function createTask(
    projectRoot: string,
    newTask: NewTask,
    causeEvent: JournalEvent,
): Promise<Task> {
    const createdAt = readMonotonicTime()
    const task = {
        id: createTimeOrderedId(createdAt),
        createdAt,
        ...newTask,
        causeEventId: causeEvent.id,
    }
    // The task comes first: should the creation stop in between, dispatching
    // its cause again finds the task and doesn't create it twice. The other
    // way round, it would find no task, and leave a task-created naming none.
    await saveTask(projectRoot, task)
    await recordEvent(projectRoot, taskCreatedEventType, {
        depth: causeEvent.depth + 1,
        taskId: task.id,
    })
    return task
}
