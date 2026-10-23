import { getCurrentId } from "../../ids/get-current-id.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { createTask } from "../task/create-task.ts"
import { createTaskId } from "../task/create-task-id.ts"
import { getTaskPositionId } from "../task/get-task-position-id.ts"
import type { Task, UncreatedTask } from "../task/schema.ts"
import { cancelTaskOnce } from "./cancel-task-once.ts"
import type { Dispatching } from "./load-dispatching.ts"

function isExistingFileError(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "EEXIST"
}

function findQueuedTaskOnTicket(
    askedTask: UncreatedTask,
    causeEvent: JournalEvent,
    { tasks, taskStates, positions }: Dispatching,
): Task | undefined {
    const { ticketNumber } = askedTask.params
    if (ticketNumber === undefined) {
        return undefined
    }
    const positionId = getCurrentId(
        positions,
        askedTask.positionId,
        causeEvent.occurredAt,
    )
    return tasks.find(
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
    if (dispatching.tasks.some(({ id }) => id === taskId)) {
        return
    }
    // A queued task shows the ticket as it is when it runs, this change
    // included: one of the same type would only repeat it, whereas one
    // of another type was asked for what the ticket no longer needs.
    const queuedTask = findQueuedTaskOnTicket(
        askedTask,
        causeEvent,
        dispatching,
    )
    if (queuedTask?.type === askedTask.type) {
        return
    }
    if (queuedTask !== undefined) {
        const reason = `Ticket #${queuedTask.params.ticketNumber} changed since: a task of type ${askedTask.type} replaces it.`
        await cancelTaskOnce(
            { kind: "cancel-task", taskId: queuedTask.id, reason },
            dispatching,
        )
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
