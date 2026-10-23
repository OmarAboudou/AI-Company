import { z } from "zod"
import { createTicket } from "../../../../messaging/ticket/create-ticket.ts"
import { defineTool } from "../../define-tool.ts"
import { readCallAuthor } from "../../read-call-author.ts"

export const ticketCreateTool = defineTool({
    description:
        "Create a ticket: ask a position, which may be yours, for work. The position then has the hand on the ticket, and works it in tasks of its own.",
    inputSchema: z.strictObject({
        title: z.string().meta({
            description:
                "What the ticket asks for, in a few words, e.g. Choose the API framework.",
        }),
        request: z.string().meta({
            description:
                "The request, in Markdown: all the position needs to know to meet it.",
            contentMediaType: "text/markdown",
        }),
        assigneePositionId: z.string().meta({
            description: "Id of the position asked, e.g. backend-developer.",
        }),
    }),
    async execute({ title, request, assigneePositionId }, ctx) {
        const ticket = await createTicket(
            ctx.journal,
            readCallAuthor(ctx),
            { title, request, rawAssigneePositionId: assigneePositionId },
            { depth: ctx.depth, runId: ctx.runId },
        )
        return {
            text: `Created ticket #${ticket.number}, for @${ticket.assignee.id}.`,
        }
    },
})
