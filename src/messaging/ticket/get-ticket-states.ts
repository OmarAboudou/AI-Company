import { getCurrentId } from "../../ids/get-current-id.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { ticketHandedOverEventType } from "./act/schema.ts"
import { type TicketAct, ticketActs } from "./act/ticket-acts.ts"
import type { Ticket, TicketOutcome, TicketStatus } from "./schema.ts"

export type TicketState = {
    status: TicketStatus
    outcome?: TicketOutcome
    requesterPositionId: string
    assigneePositionId: string
}

const actsByEventType = new Map<string, TicketAct>(
    Object.values(ticketActs).map((act) => [act.eventType.type, act]),
)

function getCreatedTicketState(
    ticket: Ticket,
    positions: readonly IdHistory[],
): TicketState {
    return {
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
    }
}

function getStateAfterAct(
    state: TicketState,
    act: TicketAct,
    event: JournalEvent,
    positions: readonly IdHistory[],
): TicketState {
    const { outcome, ...stateBeforeAct } = state
    const handedOverEvent = getEventOfType(event, ticketHandedOverEventType)
    return {
        ...stateBeforeAct,
        status: act.toStatus,
        ...(act.outcome !== undefined && { outcome: act.outcome }),
        ...(handedOverEvent !== undefined && {
            assigneePositionId: getCurrentId(
                positions,
                handedOverEvent.assigneePositionId,
                handedOverEvent.occurredAt,
            ),
        }),
    }
}

export function getTicketStates(
    tickets: readonly Ticket[],
    events: readonly JournalEvent[],
    positions: readonly IdHistory[],
): Map<number, TicketState> {
    const ticketStates = new Map(
        tickets.map((ticket) => [
            ticket.number,
            getCreatedTicketState(ticket, positions),
        ]),
    )
    for (const event of events) {
        const act = actsByEventType.get(event.type)
        const actEvent = act && getEventOfType(event, act.eventType)
        const state = actEvent && ticketStates.get(actEvent.ticketNumber)
        if (act !== undefined && actEvent !== undefined && state) {
            ticketStates.set(
                actEvent.ticketNumber,
                getStateAfterAct(state, act, event, positions),
            )
        }
    }
    return ticketStates
}
