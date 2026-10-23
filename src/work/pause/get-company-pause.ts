import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { companyPausedEventType, companyRelaunchedEventType } from "./schema.ts"

export type CompanyPause = { pausedAt: string }

export function getCompanyPause(
    events: readonly JournalEvent[],
): CompanyPause | undefined {
    const relaunchIndex = events.findLastIndex(
        ({ type }) => type === companyRelaunchedEventType.type,
    )
    const pausedEvent = events
        .slice(relaunchIndex + 1)
        .find((event) => getEventOfType(event, companyPausedEventType))
    return pausedEvent && { pausedAt: pausedEvent.occurredAt }
}
