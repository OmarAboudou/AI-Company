import { defineTicketActTool } from "../define-ticket-act-tool.ts"

export const ticketRefuseTool = defineTicketActTool({
    actName: "refuse",
    buildDescription: (ticket) =>
        `Refuse the delivery of ${ticket}, saying what is missing: its assignee then has the hand again.`,
    bodyDescription: "What is missing from the delivery, in Markdown.",
    doneText: "Refused",
})
