import { createTimeOrderedId } from "../ids/create-time-ordered-id.ts"
import { readMonotonicTime } from "../read-monotonic-time.ts"
import type { EventType, JournalEvent } from "./schema.ts"
import { saveEvent } from "./storage.ts"

export type UnrecordedEvent<Content extends Omit<JournalEvent, "id">> = Omit<
    Content,
    "type" | "occurredAt"
>

export async function recordEvent<Content extends Omit<JournalEvent, "id">>(
    projectRoot: string,
    eventType: EventType<Content>,
    unrecordedEvent: UnrecordedEvent<Content>,
): Promise<Content & { id: string }> {
    const occurredAt = readMonotonicTime()
    const content = eventType.recordingSchema.parse({
        type: eventType.type,
        occurredAt,
        ...unrecordedEvent,
    })
    const event = { ...content, id: createTimeOrderedId(occurredAt) }
    await saveEvent(projectRoot, event)
    return event
}
