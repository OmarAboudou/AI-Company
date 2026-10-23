import { defineTicketActTool } from "../define-ticket-act-tool.ts"

export const ticketAnswerTool = defineTicketActTool({
    actName: "answer",
    buildDescription: (ticket) =>
        `Answer the question the assignee of ${ticket} asked: the assignee then has the hand again.`,
    bodyDescription: "The answer, in Markdown.",
    doneText: "Answered",
})
