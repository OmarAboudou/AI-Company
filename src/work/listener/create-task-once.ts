import type { JournalEvent } from "../../journal/schema.ts"
import { createTask } from "../task/create-task.ts"
import { createTaskId } from "../task/create-task-id.ts"
import type { UncreatedTask } from "../task/schema.ts"
import type { Dispatching } from "./load-dispatching.ts"

function isExistingFileError(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "EEXIST"
}

export async function createTaskOnce(
    askedTask: UncreatedTask,
    causeEvent: JournalEvent,
    dispatching: Dispatching,
): Promise<void> {
    const taskId = createTaskId(causeEvent.id, askedTask)
    if (dispatching.tasks.some(({ id }) => id === taskId)) {
        return
    }
    try {
        const task = await createTask(
            dispatching.journal,
            askedTask,
            causeEvent,
        )
        dispatching.tasks.push(task)
        dispatching.taskStates.set(task.id, "waiting")
        dispatching.createdTasks.push(task)
    } catch (error) {
        // Another process wrote the same task meanwhile, and records it.
        if (!isExistingFileError(error)) {
            throw error
        }
    }
}
