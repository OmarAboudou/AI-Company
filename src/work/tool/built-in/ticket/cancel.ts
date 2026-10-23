import { defineTicketActTool } from "../define-ticket-act-tool.ts"

export const ticketCancelTool = defineTicketActTool({
    actName: "cancel",
    buildDescription: (ticket) =>
        `Cancel ${ticket}, withdrawing its request: the ticket is then closed, cancelled.`,
    bodyDescription: "Why the request is withdrawn, in Markdown.",
    doneText: "Cancelled",
})
