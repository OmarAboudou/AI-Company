import { z } from "zod"
import { readGitCommitter } from "../../../../git/read-git-committer.ts"
import { createUnsentMessage } from "../../../../messaging/message/create-unsent-message.ts"
import { sendUnsentMessage } from "../../../../messaging/message/send-unsent-message.ts"
import { listMessages } from "../../../../messaging/message/storage.ts"
import { loadExistingTicket } from "../../../../messaging/ticket/load-existing-ticket.ts"
import { TicketNumberSchema } from "../../../../messaging/ticket/schema.ts"
import { defineTool } from "../../define-tool.ts"

function buildDescription(ticket: string): string {
    return `Send a message in ${ticket} discussion, from your position.`
}

export const messageSendTool = defineTool({
    description: ({ ticketNumber }) =>
        buildDescription(
            ticketNumber === undefined ? "a ticket's" : "this ticket's",
        ),
    inputSchema: z.strictObject({
        ticketNumber: TicketNumberSchema.meta({
            description: "Number of the ticket, e.g. 3 for ticket #3.",
        }),
        body: z.string().meta({
            description: "The message, in Markdown.",
            contentMediaType: "text/markdown",
        }),
    }),
    async execute({ ticketNumber, body }, ctx) {
        const { projectRoot, position, worker } = ctx
        const ticket = await loadExistingTicket(projectRoot, ticketNumber)
        const author = {
            position: { id: position.id, title: position.title },
            ...(worker.kind === "employee" && {
                employee: {
                    id: worker.employee.id,
                    name: worker.employee.name,
                },
            }),
            committer: readGitCommitter(projectRoot),
        }
        const unsentMessage = createUnsentMessage(author, body)
        const message = await sendUnsentMessage(
            ctx.journal,
            ticket.number,
            unsentMessage,
            { depth: ctx.depth, runId: ctx.runId },
        )
        const ticketMessages = await listMessages(projectRoot, ticket.number)
        const messageNumber =
            ticketMessages.findIndex(({ id }) => id === message.id) + 1
        return {
            text: `Sent as message #${messageNumber} of ticket #${ticket.number}.`,
        }
    },
})
