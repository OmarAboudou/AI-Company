import { createTimeOrderedId } from "../ids/create-time-ordered-id.ts"
import { readMonotonicTime } from "../read-monotonic-time.ts"
import type { JournalEvent } from "./schema.ts"
import { saveEvent } from "./storage.ts"

type WithoutIdAndTime<Event> = Event extends unknown
    ? Omit<Event, "id" | "occurredAt">
    : never

export type UnrecordedEvent = WithoutIdAndTime<JournalEvent>

export async function recordEvent<Unrecorded extends UnrecordedEvent>(
    projectRoot: string,
    unrecordedEvent: Unrecorded,
): Promise<Unrecorded & Pick<JournalEvent, "id" | "occurredAt">> {
    const occurredAt = readMonotonicTime()
    const event = {
        id: createTimeOrderedId(occurredAt),
        occurredAt,
        ...unrecordedEvent,
    }
    await saveEvent(projectRoot, event)
    return event
}
