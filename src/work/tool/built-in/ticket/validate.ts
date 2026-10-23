import { defineTicketActTool } from "../define-ticket-act-tool.ts"

export const ticketValidateTool = defineTicketActTool({
    actName: "validate",
    buildDescription: (ticket) =>
        `Validate the delivery of ${ticket}, once you checked it: the ticket is then closed, done.`,
    bodyDescription: "What you checked, in Markdown.",
    doneText: "Validated",
})
