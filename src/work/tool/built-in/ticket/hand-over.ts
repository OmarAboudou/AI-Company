import { z } from "zod"
import { handOverTicket } from "../../../../messaging/ticket/act/hand-over-ticket.ts"
import { TicketNumberSchema } from "../../../../messaging/ticket/schema.ts"
import { defineTool } from "../../define-tool.ts"
import { readCallAuthor } from "../../read-call-author.ts"
import { buildActResult } from "../define-ticket-act-tool.ts"

export const ticketHandOverTool = defineTool({
    description: ({ ticketNumber }) =>
        `Hand ${ticketNumber === undefined ? "a ticket" : "this ticket"} over to another position: it becomes its assignee, and has the hand.`,
    inputSchema: z.strictObject({
        ticketNumber: TicketNumberSchema.meta({
            description: "Number of the ticket, e.g. 3 for ticket #3.",
        }),
        assigneePositionId: z.string().meta({
            description:
                "Id of the position to hand the ticket to, e.g. backend-developer.",
        }),
        body: z.string().meta({
            description:
                "Why the ticket changes hands, and what its new assignee should know, in Markdown.",
            contentMediaType: "text/markdown",
        }),
    }),
    async execute({ ticketNumber, assigneePositionId, body }, ctx) {
        const message = await handOverTicket(
            ctx.journal,
            readCallAuthor(ctx),
            {
                ticketNumber,
                body,
                rawAssigneePositionId: assigneePositionId,
            },
            { depth: ctx.depth, runId: ctx.runId },
        )
        return buildActResult(
            ctx.projectRoot,
            message,
            `Handed over to @${assigneePositionId}`,
        )
    },
})
