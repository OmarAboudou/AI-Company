import type { Journal } from "../../../journal/schema.ts"
import { loadCompany } from "../../../organization/company/storage.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { UserError } from "../../../user-error.ts"
import type { Author } from "../../message/schema.ts"
import { getTicketStates, type TicketState } from "../get-ticket-states.ts"
import { loadExistingTicket } from "../load-existing-ticket.ts"
import type { Ticket } from "../schema.ts"
import type { TicketAct } from "./ticket-acts.ts"

function getActorPositionId(
    { actorRole }: TicketAct,
    state: TicketState,
    directorPositionId: string,
): string {
    switch (actorRole) {
        case "requester":
            return state.requesterPositionId
        case "assignee":
            return state.assigneePositionId
        case "director":
            return directorPositionId
    }
}

function formatActorRole({ actorRole }: TicketAct): string {
    return actorRole === "director" ? "the director" : `its ${actorRole}`
}

function formatStatusReason({
    status,
    outcome,
    requesterPositionId,
}: TicketState): string {
    switch (status) {
        case "open":
            return "its assignee has the hand"
        case "waiting":
            return `it waits for @${requesterPositionId} to answer`
        case "to-validate":
            return `it waits for @${requesterPositionId} to validate it`
        case "closed":
            return `it is closed, ${outcome}`
    }
}

export async function requireTicketAct(
    journal: Journal,
    act: TicketAct,
    author: Author,
    ticketNumber: number,
): Promise<Ticket> {
    const { projectRoot } = journal
    const [ticket, positions, { directorPositionId }] = await Promise.all([
        loadExistingTicket(projectRoot, ticketNumber),
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    const state = getTicketStates([ticket], journal.events, positions).get(
        ticket.number,
    )
    if (state === undefined) {
        throw new Error(`Ticket #${ticket.number} got no state`)
    }
    const actorPositionId = getActorPositionId(act, state, directorPositionId)
    if (author.position.id !== actorPositionId) {
        throw new UserError(
            `You can't ${act.action} ticket #${ticket.number}: only ${formatActorRole(act)}, @${actorPositionId}, can.`,
        )
    }
    if (!act.fromStatuses.includes(state.status)) {
        throw new UserError(
            `You can't ${act.action} ticket #${ticket.number} now: ${formatStatusReason(state)}.`,
        )
    }
    return ticket
}
