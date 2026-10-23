import { z } from "zod"
import { listMessages } from "../../../messaging/message/storage.ts"
import { actOnTicket } from "../../../messaging/ticket/act/act-on-ticket.ts"
import type { TicketActName } from "../../../messaging/ticket/act/ticket-acts.ts"
import { TicketNumberSchema } from "../../../messaging/ticket/schema.ts"
import { defineTool } from "../define-tool.ts"
import { readCallAuthor } from "../read-call-author.ts"

export type TicketActToolDefinition = {
    actName: TicketActName
    buildDescription(ticket: string): string
    bodyDescription: string
    doneText: string
}

export function defineTicketActTool({
    actName,
    buildDescription,
    bodyDescription,
    doneText,
}: TicketActToolDefinition) {
    return defineTool({
        description: ({ ticketNumber }) =>
            buildDescription(
                ticketNumber === undefined ? "a ticket" : "this ticket",
            ),
        inputSchema: z.strictObject({
            ticketNumber: TicketNumberSchema.meta({
                description: "Number of the ticket, e.g. 3 for ticket #3.",
            }),
            body: z.string().meta({
                description: bodyDescription,
                contentMediaType: "text/markdown",
            }),
        }),
        async execute({ ticketNumber, body }, ctx) {
            const message = await actOnTicket(
                ctx.journal,
                actName,
                readCallAuthor(ctx),
                { ticketNumber, body },
                { depth: ctx.depth, runId: ctx.runId },
            )
            const ticketMessages = await listMessages(
                ctx.projectRoot,
                ticketNumber,
            )
            const messageNumber =
                ticketMessages.findIndex(({ id }) => id === message.id) + 1
            return {
                text: `${doneText}, as message #${messageNumber} of ticket #${ticketNumber}.`,
            }
        },
    })
}
