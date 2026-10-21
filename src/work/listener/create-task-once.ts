import { getCurrentId } from "../../ids/get-current-id.ts"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { createTask } from "../task/create-task.ts"
import { getTaskPositionId } from "../task/get-task-position-id.ts"
import { chainStoppedEventType, type UncreatedTask } from "../task/schema.ts"
import type { Dispatching } from "./load-dispatching.ts"

function isCreated(
    uncreatedTask: UncreatedTask,
    causeEventId: string,
    { tasks, positions }: Dispatching,
): boolean {
    return tasks.some(
        (task) =>
            task.causeEventId === causeEventId &&
            task.type === uncreatedTask.type &&
            getTaskPositionId(task, positions) === uncreatedTask.positionId &&
            Bun.deepEquals(task.params, uncreatedTask.params),
    )
}

function isStopped(
    uncreatedTask: UncreatedTask,
    causeEventId: string,
    { events, chainStoppedEvents, positions }: Dispatching,
): boolean {
    return [...events, ...chainStoppedEvents].some((event) => {
        const chainStoppedEvent = getEventOfType(event, chainStoppedEventType)
        if (chainStoppedEvent?.causeEventId !== causeEventId) {
            return false
        }
        const { stoppedTask, occurredAt } = chainStoppedEvent
        const positionId = getCurrentId(
            positions,
            stoppedTask.positionId,
            occurredAt,
        )
        return Bun.deepEquals({ ...stoppedTask, positionId }, uncreatedTask)
    })
}

export async function createTaskOnce(
    askedTask: UncreatedTask,
    causeEvent: JournalEvent,
    dispatching: Dispatching,
): Promise<void> {
    const { projectRoot, positions, maxTaskDepth } = dispatching
    const uncreatedTask = {
        ...askedTask,
        positionId: getCurrentId(
            positions,
            askedTask.positionId,
            causeEvent.occurredAt,
        ),
    }
    if (causeEvent.depth + 1 > maxTaskDepth) {
        if (!isStopped(uncreatedTask, causeEvent.id, dispatching)) {
            const chainStoppedEvent = await recordEvent(
                projectRoot,
                chainStoppedEventType,
                {
                    depth: causeEvent.depth,
                    causeEventId: causeEvent.id,
                    stoppedTask: uncreatedTask,
                },
            )
            dispatching.chainStoppedEvents.push(chainStoppedEvent)
        }
        return
    }
    if (isCreated(uncreatedTask, causeEvent.id, dispatching)) {
        return
    }
    const task = await createTask(projectRoot, uncreatedTask, causeEvent)
    dispatching.tasks.push(task)
    dispatching.taskStates.set(task.id, "waiting")
    dispatching.createdTasks.push(task)
}
