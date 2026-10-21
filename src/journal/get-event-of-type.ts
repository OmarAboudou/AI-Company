import { z } from "zod"
import { UserError } from "../user-error.ts"
import type { EventType, JournalEvent } from "./schema.ts"

export function getEventOfType<Schema extends z.ZodType>(
    event: JournalEvent,
    eventType: EventType<Schema>,
): (z.output<Schema> & { id: string }) | undefined {
    if (event.type !== eventType.type) {
        return undefined
    }
    const { id, ...content } = event
    const validation = eventType.schema.safeParse(content)
    if (!validation.success) {
        throw new UserError(
            `Invalid .llmco/journal/${id}.json:\n${z.prettifyError(validation.error)}`,
        )
    }
    return Object.assign({ id }, validation.data)
}
