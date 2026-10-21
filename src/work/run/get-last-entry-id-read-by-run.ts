import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import {
    type Message,
    messageSentEventType,
} from "../../messaging/message/schema.ts"

export function getLastEntryIdReadByRun(
    threadMessages: Message[],
    events: JournalEvent[],
    { runId, lastShownEntryId }: { runId: string; lastShownEntryId: string },
): string {
    const sentMessageIds = new Set(
        events.flatMap((event) => {
            const messageSentEvent = getEventOfType(event, messageSentEventType)
            return messageSentEvent?.runId === runId
                ? [messageSentEvent.messageId]
                : []
        }),
    )
    let lastReadEntryId = lastShownEntryId
    for (const { id } of threadMessages) {
        if (id <= lastShownEntryId) {
            continue
        }
        // An entry from elsewhere, written during the run, wasn't read.
        if (!sentMessageIds.has(id)) {
            break
        }
        lastReadEntryId = id
    }
    return lastReadEntryId
}
