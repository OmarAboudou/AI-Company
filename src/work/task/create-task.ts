import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { readMonotonicTime } from "../../read-monotonic-time.ts"
import type { Task } from "./schema.ts"
import { saveTask } from "./storage.ts"

export async function createTask(
    projectRoot: string,
    definition: Omit<Task, "id" | "createdAt">,
): Promise<Task> {
    const createdAt = readMonotonicTime()
    const task = {
        id: createTimeOrderedId(createdAt),
        createdAt,
        ...definition,
    }
    // The task comes first: should the creation stop in between, dispatching
    // its cause again finds the task and doesn't create it twice. The other
    // way round, it would find no task, and leave a task-created naming none.
    await saveTask(projectRoot, task)
    await recordEvent(projectRoot, {
        type: "task-created",
        depth: task.depth,
        taskId: task.id,
    })
    return task
}
