import { z } from "zod"
import { UserError } from "../user-error.ts"
import type { EventType, JournalEvent } from "./schema.ts"

export function getEventOfType<Content extends Omit<JournalEvent, "id">>(
    event: JournalEvent,
    eventType: EventType<Content>,
): (Content & { id: string }) | undefined {
    if (event.type !== eventType.type) {
        return undefined
    }
    const { id, ...content } = event
    const validation = eventType.recordingSchema.safeParse(content)
    if (!validation.success) {
        throw new UserError(
            `Invalid .llmco/journal/${id}.json:\n${z.prettifyError(validation.error)}`,
        )
    }
    return { ...validation.data, id }
}
