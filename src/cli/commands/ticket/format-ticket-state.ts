import type { TicketState } from "../../../messaging/ticket/get-ticket-states.ts"

export function formatTicketState({
    status,
    outcome,
    requesterPositionId,
    assigneePositionId,
}: TicketState): string {
    switch (status) {
        case "open":
            return `open, @${assigneePositionId} has the hand`
        case "waiting":
            return `waiting for @${requesterPositionId} to answer`
        case "to-validate":
            return `to validate by @${requesterPositionId}`
        case "closed":
            return `closed, ${outcome}`
    }
}
