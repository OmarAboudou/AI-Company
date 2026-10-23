import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { Journal } from "../../journal/schema.ts"
import type { WorkCatalog } from "../work-catalog.ts"
import { applyListenerEffect } from "./apply-listener-effect.ts"
import { type Dispatching, loadDispatching } from "./load-dispatching.ts"
import { loadDispatchedEventIds, saveDispatchedEventIds } from "./storage.ts"

export type DispatchEventsResult = Pick<
    Dispatching,
    "createdTasks" | "doneTasks"
>

export async function dispatchEvents(
    journal: Journal,
    { taskTypes, listeners }: WorkCatalog,
): Promise<DispatchEventsResult> {
    const { projectRoot } = journal
    const [dispatchedEventIds, dispatching] = await Promise.all([
        loadDispatchedEventIds(projectRoot),
        loadDispatching(journal, taskTypes),
    ])
    const newEvents = journal.events.filter(
        ({ id }) => !dispatchedEventIds.has(id),
    )
    for (const event of newEvents) {
        for (const listener of listeners) {
            const listenedEvent = getEventOfType(event, listener.eventType)
            if (listenedEvent === undefined) {
                continue
            }
            const effects = listener.getEffects(listenedEvent, dispatching)
            for (const effect of effects) {
                await applyListenerEffect(effect, event, dispatching)
            }
        }
        dispatchedEventIds.add(event.id)
    }
    if (newEvents.length > 0) {
        await saveDispatchedEventIds(projectRoot, dispatchedEventIds)
    }
    const { createdTasks, doneTasks } = dispatching
    return { createdTasks, doneTasks }
}
