import { UserError } from "../user-error.ts"
import type { Journal, JournalEvent } from "./schema.ts"

export function requireJournalEvent(
    journal: Journal,
    eventId: string,
): JournalEvent {
    const event = journal.events.find(({ id }) => id === eventId)
    if (event === undefined) {
        throw new UserError(`Missing file: .aico/journal/${eventId}.json`)
    }
    return event
}
