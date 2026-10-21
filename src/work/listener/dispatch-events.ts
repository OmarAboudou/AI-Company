import { getCurrentId } from "../../ids/get-current-id.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { listEvents } from "../../journal/storage.ts"
import { listPositions } from "../../organization/position/storage.ts"
import { createTask } from "../task/create-task.ts"
import { getTaskPositionId } from "../task/get-task-position-id.ts"
import type { Task } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"
import type { Listener, NewTask } from "./define-listener.ts"
import { loadDispatchedEventIds, saveDispatchedEventIds } from "./storage.ts"

export type DispatchEventsResult = { createdTasks: Task[] }

function getNewTasks(
    listeners: Listener[],
    event: JournalEvent,
    positions: IdHistory[],
): NewTask[] {
    return listeners.flatMap((listener) => {
        // TypeScript can't tell that the handler looked up for an event's
        // type takes that type of event.
        const handleEvent = listener.on[event.type] as
            | ((event: JournalEvent) => NewTask[])
            | undefined
        return (handleEvent?.(event) ?? []).map((newTask) => ({
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

export async function dispatchEvents(
    projectRoot: string,
    listeners: Listener[],
): Promise<DispatchEventsResult> {
    const [events, tasks, dispatchedEventIds, positions] = await Promise.all([
        listEvents(projectRoot),
        listTasks(projectRoot),
        loadDispatchedEventIds(projectRoot),
        listPositions(projectRoot),
    ])
    const newEvents = events.filter(({ id }) => !dispatchedEventIds.has(id))
    const createdTasks: Task[] = []
    for (const event of newEvents) {
        for (const newTask of getNewTasks(listeners, event, positions)) {
            const knownTasks = [...tasks, ...createdTasks]
            if (isCreated(newTask, event.id, knownTasks, positions)) {
                continue
            }
            const task = await createTask(projectRoot, {
                ...newTask,
                depth: event.depth + 1,
                causeEventId: event.id,
            })
            createdTasks.push(task)
        }
        dispatchedEventIds.add(event.id)
    }
    if (newEvents.length > 0) {
        await saveDispatchedEventIds(projectRoot, dispatchedEventIds)
    }
    return { createdTasks }
}
