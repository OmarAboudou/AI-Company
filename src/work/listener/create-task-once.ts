import { getCurrentId } from "../../ids/get-current-id.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { createTask } from "../task/create-task.ts"
import { createTaskId } from "../task/create-task-id.ts"
import { getTaskPositionId } from "../task/get-task-position-id.ts"
import type { UncreatedTask } from "../task/schema.ts"
import type { Dispatching } from "./load-dispatching.ts"

function isExistingFileError(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "EEXIST"
}

// The queued task shows the ticket as it is when it runs, this change
// included: a second one would only repeat it.
function hasQueuedTaskOnTicket(
    askedTask: UncreatedTask,
    causeEvent: JournalEvent,
    { tasks, taskStates, positions }: Dispatching,
): boolean {
    const { ticketNumber } = askedTask.params
    if (ticketNumber === undefined) {
        return false
    }
    const positionId = getCurrentId(
        positions,
        askedTask.positionId,
        causeEvent.occurredAt,
    )
    return tasks.some(
        (task) =>
            task.params.ticketNumber === ticketNumber &&
            taskStates.get(task.id) === "queued" &&
            getTaskPositionId(task, positions) === positionId,
    )
}

export async function createTaskOnce(
    askedTask: UncreatedTask,
    causeEvent: JournalEvent,
    dispatching: Dispatching,
): Promise<void> {
    const taskId = createTaskId(causeEvent.id, askedTask)
    if (
        dispatching.tasks.some(({ id }) => id === taskId) ||
        hasQueuedTaskOnTicket(askedTask, causeEvent, dispatching)
    ) {
        return
    }
    try {
        const task = await createTask(
            dispatching.journal,
            askedTask,
            causeEvent,
        )
        dispatching.tasks.push(task)
        dispatching.taskStates.set(task.id, "queued")
        dispatching.createdTasks.push(task)
    } catch (error) {
        // Another process wrote the same task meanwhile, and records it.
        if (!isExistingFileError(error)) {
            throw error
        }
    }
}
