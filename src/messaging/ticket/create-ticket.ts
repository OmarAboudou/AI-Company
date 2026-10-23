import { recordEvent } from "../../journal/record-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import { loadExistingPosition } from "../../organization/position/load-existing-position.ts"
import { parseConfig } from "../../parse-config.ts"
import { UserError } from "../../user-error.ts"
import type { Author } from "../message/schema.ts"
import { createTicketNumber } from "./create-ticket-number.ts"
import {
    type Ticket,
    TicketConfigSchema,
    ticketCreatedEventType,
} from "./schema.ts"
import { saveNewTicket } from "./storage.ts"

export type TicketToCreate = {
    title: string
    request: string
    rawAssigneePositionId: string
}

export async function createTicket(
    journal: Journal,
    author: Author,
    { title, request, rawAssigneePositionId }: TicketToCreate,
    { depth, runId }: { depth: number; runId?: string },
): Promise<Ticket> {
    const { projectRoot } = journal
    if (request.trim() === "") {
        throw new UserError("The ticket's request is empty.")
    }
    const [{ directorPositionId }, assignee] = await Promise.all([
        loadCompany(projectRoot),
        loadExistingPosition(projectRoot, rawAssigneePositionId),
    ])
    if (author.position.id !== directorPositionId) {
        throw new UserError(
            `Only the director creates tickets for now: ask @${directorPositionId} instead.`,
        )
    }
    const { position: requester, ...authorship } = author
    const config = parseConfig(TicketConfigSchema, {
        title,
        requester,
        assignee: { id: assignee.id, title: assignee.title },
        ...authorship,
        createdAt: new Date().toISOString(),
    })
    const ticket = {
        number: await createTicketNumber(projectRoot),
        ...config,
        request,
    }
    // The ticket comes first: should the creation stop in between, its
    // number stays taken, rather than an event naming a ticket that the
    // next creation would number the same.
    await saveNewTicket(projectRoot, ticket)
    await recordEvent(journal, ticketCreatedEventType, {
        depth,
        ticketNumber: ticket.number,
        requesterPositionId: requester.id,
        assigneePositionId: assignee.id,
        ...(runId !== undefined && { runId }),
    })
    return ticket
}
