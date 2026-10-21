import { createTimeOrderedId } from "../ids/create-time-ordered-id.ts"
import { readMonotonicTime } from "../read-monotonic-time.ts"
import type { JournalEvent } from "./schema.ts"
import { saveEvent } from "./storage.ts"

type WithoutIdAndTime<Event> = Event extends unknown
    ? Omit<Event, "id" | "occurredAt">
    : never

export type NewJournalEvent = WithoutIdAndTime<JournalEvent>

export async function createEvent(
    projectRoot: string,
    newEvent: NewJournalEvent,
): Promise<JournalEvent> {
    const occurredAt = readMonotonicTime()
    const event = {
        id: createTimeOrderedId(occurredAt),
        occurredAt,
        ...newEvent,
    }
    await saveEvent(projectRoot, event)
    return event
}
