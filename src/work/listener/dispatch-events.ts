import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { Journal } from "../../journal/schema.ts"
import type { WorkCatalog } from "../work-catalog.ts"
import { applyListenerEffect } from "./apply-listener-effect.ts"
import { type Dispatching, loadDispatching } from "./load-dispatching.ts"
import { eventsDispatchedEventType } from "./schema.ts"

export type DispatchEventsResult = Pick<
    Dispatching,
    "createdTasks" | "doneTasks" | "cancelledTasks"
>

function getDispatchedEventIds({ events }: Journal): Set<string> {
    return new Set(
        events.flatMap(
            (event) =>
                getEventOfType(event, eventsDispatchedEventType)?.eventIds ??
                [],
        ),
    )
}

export async function dispatchEvents(
    journal: Journal,
    { taskTypes, listeners }: WorkCatalog,
): Promise<DispatchEventsResult> {
    const dispatching = await loadDispatching(journal, taskTypes)
    const dispatchedEventIds = getDispatchedEventIds(journal)
    const newEvents = journal.events.filter(
        ({ id, type }) =>
            type !== eventsDispatchedEventType.type &&
            !dispatchedEventIds.has(id),
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
    }
    if (newEvents.length > 0) {
        await recordEvent(journal, eventsDispatchedEventType, {
            depth: 0,
            eventIds: newEvents.map(({ id }) => id),
        })
    }
    const { createdTasks, doneTasks, cancelledTasks } = dispatching
    return { createdTasks, doneTasks, cancelledTasks }
}
