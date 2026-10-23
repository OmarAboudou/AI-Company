import { defineTicketActTool } from "../define-ticket-act-tool.ts"

export const ticketGiveBackTool = defineTicketActTool({
    actName: "give-back",
    buildDescription: (ticket) =>
        `Give ${ticket}, renounced, back to its assignee, saying what was readjusted: it resumes its work.`,
    bodyDescription:
        "What you readjusted, and what the assignee should do now, in Markdown.",
    doneText: "Given back",
})
