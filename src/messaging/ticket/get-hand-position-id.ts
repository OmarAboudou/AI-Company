import type { TicketState } from "./get-ticket-states.ts"

export function getHandPositionId(
    state: TicketState,
    directorPositionId: string,
): string | undefined {
    switch (state.status) {
        case "open":
            return state.assigneePositionId
        case "waiting":
        case "to-validate":
            return state.requesterPositionId
        case "to-arbitrate":
            return directorPositionId
        case "closed":
            return undefined
    }
}
