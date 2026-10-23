import { defineTicketActTool } from "../define-ticket-act-tool.ts"

export const ticketCloseTool = defineTicketActTool({
    actName: "close",
    buildDescription: (ticket) =>
        `Close ${ticket} as failed, when its request won't be met: its queued tasks are cancelled.`,
    bodyDescription:
        "Why the request won't be met, in Markdown: the ticket's positions read it.",
    doneText: "Closed, failed",
})
