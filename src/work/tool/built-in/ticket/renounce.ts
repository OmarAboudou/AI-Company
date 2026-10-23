import { defineTicketActTool } from "../define-ticket-act-tool.ts"

export const ticketRenounceTool = defineTicketActTool({
    actName: "renounce",
    buildDescription: (ticket) =>
        `Renounce ${ticket}, when you can't meet its request: the company pauses, and the director arbitrates, from what you say went wrong.`,
    bodyDescription:
        "What went wrong, and what was missing to meet the request, in Markdown: the director reads it to readjust the company.",
    doneText: "Renounced",
})
