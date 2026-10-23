import type { Journal } from "../../../journal/schema.ts"
import { loadExistingPosition } from "../../../organization/position/load-existing-position.ts"
import { UserError } from "../../../user-error.ts"
import { createUnsentMessage } from "../../message/create-unsent-message.ts"
import type { Author, Message } from "../../message/schema.ts"
import { sendUnsentMessage } from "../../message/send-unsent-message.ts"
import type { TicketActing } from "./act-on-ticket.ts"
import { requireTicketAct } from "./require-ticket-act.ts"
import { ticketActs } from "./ticket-acts.ts"

export type TicketHandingOver = TicketActing & { rawAssigneePositionId: string }

export async function handOverTicket(
    journal: Journal,
    author: Author,
    { ticketNumber, body, rawAssigneePositionId }: TicketHandingOver,
    { depth, runId }: { depth: number; runId?: string },
): Promise<Message> {
    const act = ticketActs["hand-over"]
    const [{ ticket, state }, assignee] = await Promise.all([
        requireTicketAct(journal, act, author, ticketNumber),
        loadExistingPosition(journal.projectRoot, rawAssigneePositionId),
    ])
    if (assignee.id === state.assigneePositionId) {
        throw new UserError(
            `@${assignee.id} is already the assignee of ticket #${ticket.number}: hand it over to another position.`,
        )
    }
    return sendUnsentMessage(
        journal,
        ticket.number,
        createUnsentMessage(author, body),
        {
            depth,
            runId,
            eventType: act.eventType,
            eventFields: { assigneePositionId: assignee.id },
        },
    )
}
