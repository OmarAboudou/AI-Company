import type { Journal } from "../../../journal/schema.ts"
import { createUnsentMessage } from "../../message/create-unsent-message.ts"
import type { Author, Message } from "../../message/schema.ts"
import { sendUnsentMessage } from "../../message/send-unsent-message.ts"
import { requireTicketAct } from "./require-ticket-act.ts"
import {
    type TicketAct,
    type TicketActName,
    ticketActs,
} from "./ticket-acts.ts"

export type TicketActing = {
    ticketNumber: number
    body: string
}

export async function actOnTicket(
    journal: Journal,
    actName: TicketActName,
    author: Author,
    { ticketNumber, body }: TicketActing,
    { depth, runId }: { depth: number; runId?: string },
): Promise<Message> {
    const act: TicketAct = ticketActs[actName]
    const ticket = await requireTicketAct(journal, act, author, ticketNumber)
    return sendUnsentMessage(
        journal,
        ticket.number,
        createUnsentMessage(author, body),
        { depth, runId, eventType: act.eventType },
    )
}
