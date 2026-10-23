import { defineTicketActTool } from "../define-ticket-act-tool.ts"

export const ticketDeliverTool = defineTicketActTool({
    actName: "deliver",
    buildDescription: (ticket) =>
        `Deliver ${ticket} once its request is met: its requester then checks the delivery, to validate or refuse it.`,
    bodyDescription:
        "What you did and how to check it, in Markdown: the requester reads it, without the rest of your work.",
    doneText: "Delivered",
})
