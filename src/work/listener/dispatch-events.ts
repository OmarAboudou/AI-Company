import type { JournalEvent } from "../../journal/schema.ts"
import { listEvents } from "../../journal/storage.ts"
import { createTask } from "../task/create-task.ts"
import type { Task } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"
import type { Listener, NewTask } from "./define-listener.ts"
import { loadDispatchedEventIds, saveDispatchedEventIds } from "./storage.ts"

export type DispatchEventsResult = { createdTasks: Task[] }

function getNewTasks(listeners: Listener[], event: JournalEvent): NewTask[] {
    return listeners.flatMap((listener) => {
        // TypeScript can't tell that the handler looked up for an event's
        // type takes that type of event.
        const handleEvent = listener.on[event.type] as
            | ((event: JournalEvent) => NewTask[])
            | undefined
        return handleEvent?.(event) ?? []
    })
}

function isCreated(newTask: NewTask, causeEventId: string, tasks: Task[]) {
    return tasks.some(
        (task) =>
            task.causeEventId === causeEventId &&
            task.type === newTask.type &&
            task.positionId === newTask.positionId &&
            Bun.deepEquals(task.params, newTask.params),
    )
}

export async function dispatchEvents(
    projectRoot: string,
    listeners: Listener[],
): Promise<DispatchEventsResult> {
    const [events, tasks, dispatchedEventIds] = await Promise.all([
        listEvents(projectRoot),
        listTasks(projectRoot),
        loadDispatchedEventIds(projectRoot),
    ])
    const newEvents = events.filter(({ id }) => !dispatchedEventIds.has(id))
    const createdTasks: Task[] = []
    for (const event of newEvents) {
        for (const newTask of getNewTasks(listeners, event)) {
            if (isCreated(newTask, event.id, [...tasks, ...createdTasks])) {
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
