import { getCurrentId } from "../../ids/get-current-id.ts"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { createTask } from "../task/create-task.ts"
import { createTaskId } from "../task/create-task-id.ts"
import { chainStoppedEventType, type UncreatedTask } from "../task/schema.ts"
import type { Dispatching } from "./load-dispatching.ts"

function isExistingFileError(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "EEXIST"
}

function isStopped(
    stoppedTask: UncreatedTask,
    causeEventId: string,
    { journal, positions }: Dispatching,
): boolean {
    return journal.events.some((event) => {
        const chainStoppedEvent = getEventOfType(event, chainStoppedEventType)
        if (chainStoppedEvent?.causeEventId !== causeEventId) {
            return false
        }
        const { occurredAt } = chainStoppedEvent
        const positionId = getCurrentId(
            positions,
            chainStoppedEvent.stoppedTask.positionId,
            occurredAt,
        )
        return Bun.deepEquals(
            { ...chainStoppedEvent.stoppedTask, positionId },
            stoppedTask,
        )
    })
}

async function stopChainOnce(
    askedTask: UncreatedTask,
    causeEvent: JournalEvent,
    dispatching: Dispatching,
): Promise<void> {
    const { journal, positions } = dispatching
    const stoppedTask = {
        ...askedTask,
        positionId: getCurrentId(
            positions,
            askedTask.positionId,
            causeEvent.occurredAt,
        ),
    }
    if (isStopped(stoppedTask, causeEvent.id, dispatching)) {
        return
    }
    const chainStoppedEvent = await recordEvent(
        journal,
        chainStoppedEventType,
        { depth: causeEvent.depth, causeEventId: causeEvent.id, stoppedTask },
    )
    dispatching.chainStoppedEvents.push(chainStoppedEvent)
}

export async function createTaskOnce(
    askedTask: UncreatedTask,
    causeEvent: JournalEvent,
    dispatching: Dispatching,
): Promise<void> {
    if (causeEvent.depth + 1 > dispatching.maxTaskDepth) {
        return stopChainOnce(askedTask, causeEvent, dispatching)
    }
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
