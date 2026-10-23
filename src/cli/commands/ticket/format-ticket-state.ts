import type { TicketState } from "../../../messaging/ticket/get-ticket-states.ts"

export function formatTicketState({
    status,
    assigneePositionId,
}: TicketState): string {
    switch (status) {
        case "open":
            return `open, @${assigneePositionId} has the hand`
    }
}
