import type { TicketState } from "./get-ticket-states.ts"

export function getHandPositionId(state: TicketState): string | undefined {
    switch (state.status) {
        case "open":
            return state.assigneePositionId
        case "waiting":
        case "to-validate":
            return state.requesterPositionId
        case "closed":
            return undefined
    }
}
