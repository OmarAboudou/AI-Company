import { getCurrentId } from "../../ids/get-current-id.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { listEvents } from "../../journal/storage.ts"
import { defaultMaxTaskDepth } from "../../organization/company/schema.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import { listPositions } from "../../organization/position/storage.ts"
import { createTask } from "../task/create-task.ts"
import { getTaskPositionId } from "../task/get-task-position-id.ts"
import {
    type ChainStoppedEvent,
    chainStoppedEventType,
    type Task,
    type UncreatedTask,
} from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"
import type { Listener } from "./define-listener.ts"
import { loadDispatchedEventIds, saveDispatchedEventIds } from "./storage.ts"

export type DispatchEventsResult = {
    createdTasks: Task[]
    chainStoppedEvents: ChainStoppedEvent[]
}

function getTasksToCreate(
    listeners: Listener[],
    event: JournalEvent,
    positions: IdHistory[],
): UncreatedTask[] {
    return listeners.flatMap((listener) => {
        const listenedEvent = getEventOfType(event, listener.eventType)
        if (listenedEvent === undefined) {
            return []
        }
        return listener.getEffects(listenedEvent).map(({ task }) => ({
            ...task,
            positionId: getCurrentId(
                positions,
                task.positionId,
                event.occurredAt,
            ),
        }))
    })
}

function isCreated(
    uncreatedTask: UncreatedTask,
    causeEventId: string,
    tasks: Task[],
    positions: IdHistory[],
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
    events: JournalEvent[],
    positions: IdHistory[],
): boolean {
    return events.some((event) => {
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

export async function dispatchEvents(
    projectRoot: string,
    listeners: Listener[],
): Promise<DispatchEventsResult> {
    const [events, tasks, dispatchedEventIds, positions, company] =
        await Promise.all([
            listEvents(projectRoot),
            listTasks(projectRoot),
            loadDispatchedEventIds(projectRoot),
            listPositions(projectRoot),
            loadCompany(projectRoot),
        ])
    const maxTaskDepth = company.maxTaskDepth ?? defaultMaxTaskDepth
    const newEvents = events.filter(({ id }) => !dispatchedEventIds.has(id))
    const createdTasks: Task[] = []
    const chainStoppedEvents: ChainStoppedEvent[] = []
    for (const event of newEvents) {
        for (const uncreatedTask of getTasksToCreate(
            listeners,
            event,
            positions,
        )) {
            const taskDepth = event.depth + 1
            const knownEvents = [...events, ...chainStoppedEvents]
            const knownTasks = [...tasks, ...createdTasks]
            if (taskDepth > maxTaskDepth) {
                if (
                    !isStopped(uncreatedTask, event.id, knownEvents, positions)
                ) {
                    const chainStoppedEvent = await recordEvent(
                        projectRoot,
                        chainStoppedEventType,
                        {
                            depth: event.depth,
                            causeEventId: event.id,
                            stoppedTask: uncreatedTask,
                        },
                    )
                    chainStoppedEvents.push(chainStoppedEvent)
                }
            } else if (
                !isCreated(uncreatedTask, event.id, knownTasks, positions)
            ) {
                const task = await createTask(projectRoot, uncreatedTask, event)
                createdTasks.push(task)
            }
        }
        dispatchedEventIds.add(event.id)
    }
    if (newEvents.length > 0) {
        await saveDispatchedEventIds(projectRoot, dispatchedEventIds)
    }
    return { createdTasks, chainStoppedEvents }
}
