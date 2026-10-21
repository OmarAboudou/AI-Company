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
import type { NewTask, Task } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"
import type { Listener } from "./define-listener.ts"
import { type ChainStoppedEvent, chainStoppedEventType } from "./schema.ts"
import { loadDispatchedEventIds, saveDispatchedEventIds } from "./storage.ts"

export type DispatchEventsResult = {
    createdTasks: Task[]
    chainStoppedEvents: ChainStoppedEvent[]
}

function getNewTasks(
    listeners: Listener[],
    event: JournalEvent,
    positions: IdHistory[],
): NewTask[] {
    return listeners.flatMap((listener) => {
        const listenedEvent = getEventOfType(event, listener.eventType)
        if (listenedEvent === undefined) {
            return []
        }
        return listener.getNewTasks(listenedEvent).map((newTask) => ({
            ...newTask,
            positionId: getCurrentId(
                positions,
                newTask.positionId,
                event.occurredAt,
            ),
        }))
    })
}

function isCreated(
    newTask: NewTask,
    causeEventId: string,
    tasks: Task[],
    positions: IdHistory[],
): boolean {
    return tasks.some(
        (task) =>
            task.causeEventId === causeEventId &&
            task.type === newTask.type &&
            getTaskPositionId(task, positions) === newTask.positionId &&
            Bun.deepEquals(task.params, newTask.params),
    )
}

function isStopped(
    newTask: NewTask,
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
        return Bun.deepEquals({ ...stoppedTask, positionId }, newTask)
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
        for (const newTask of getNewTasks(listeners, event, positions)) {
            const depth = event.depth + 1
            const knownEvents = [...events, ...chainStoppedEvents]
            const knownTasks = [...tasks, ...createdTasks]
            if (depth > maxTaskDepth) {
                if (!isStopped(newTask, event.id, knownEvents, positions)) {
                    const chainStoppedEvent = await recordEvent(
                        projectRoot,
                        chainStoppedEventType,
                        {
                            depth: event.depth,
                            causeEventId: event.id,
                            stoppedTask: newTask,
                        },
                    )
                    chainStoppedEvents.push(chainStoppedEvent)
                }
            } else if (!isCreated(newTask, event.id, knownTasks, positions)) {
                const task = await createTask(projectRoot, {
                    ...newTask,
                    depth,
                    causeEventId: event.id,
                })
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
