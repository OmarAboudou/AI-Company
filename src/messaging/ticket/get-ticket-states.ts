import { getCurrentId } from "../../ids/get-current-id.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Ticket } from "./schema.ts"

export type TicketStatus = "open"

export type TicketState = {
    status: TicketStatus
    requesterPositionId: string
    assigneePositionId: string
}

export function getTicketStates(
    tickets: readonly Ticket[],
    positions: readonly IdHistory[],
): Map<number, TicketState> {
    return new Map(
        tickets.map((ticket) => [
            ticket.number,
            {
                status: "open",
                requesterPositionId: getCurrentId(
                    positions,
                    ticket.requester.id,
                    ticket.createdAt,
                ),
                assigneePositionId: getCurrentId(
                    positions,
                    ticket.assignee.id,
                    ticket.createdAt,
                ),
            },
        ]),
    )
}
