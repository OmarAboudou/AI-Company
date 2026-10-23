import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { taskFailedEventType } from "../task/schema.ts"
import { companyPausedEventType, companyRelaunchedEventType } from "./schema.ts"

export type PauseCause =
    | { kind: "command" }
    | { kind: "failure"; taskId: string; reason: string }

export type CompanyPause = { pausedAt: string; cause: PauseCause }

function getPauseCause(event: JournalEvent): PauseCause | undefined {
    if (getEventOfType(event, companyPausedEventType) !== undefined) {
        return { kind: "command" }
    }
    const failedEvent = getEventOfType(event, taskFailedEventType)
    return (
        failedEvent && {
            kind: "failure",
            taskId: failedEvent.taskId,
            reason: failedEvent.reason,
        }
    )
}

export function getCompanyPause(
    events: readonly JournalEvent[],
): CompanyPause | undefined {
    const relaunchIndex = events.findLastIndex(
        ({ type }) => type === companyRelaunchedEventType.type,
    )
    for (const event of events.slice(relaunchIndex + 1)) {
        const cause = getPauseCause(event)
        if (cause !== undefined) {
            return { pausedAt: event.occurredAt, cause }
        }
    }
    return undefined
}
