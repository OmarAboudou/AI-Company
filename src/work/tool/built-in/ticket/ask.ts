import { defineTicketActTool } from "../define-ticket-act-tool.ts"

export const ticketAskTool = defineTicketActTool({
    actName: "ask",
    buildDescription: (ticket) =>
        `Ask the requester of ${ticket} a question you can't go on without: it then has the hand, until it answers.`,
    bodyDescription: "The question, in Markdown.",
    doneText: "Question asked",
})
