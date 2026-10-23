import { defineMessageEventType } from "../../message/schema.ts"

export const questionAskedEventType = defineMessageEventType({
    type: "ticket-question-asked",
    description:
        "The ticket's assignee asked its requester a question: the requester has the hand.",
})

export const questionAnsweredEventType = defineMessageEventType({
    type: "ticket-question-answered",
    description:
        "The ticket's requester answered the assignee's question: the assignee has the hand again.",
})

export const ticketDeliveredEventType = defineMessageEventType({
    type: "ticket-delivered",
    description:
        "The ticket's assignee delivered it, its message summing up what was done: the requester has the hand, to validate the delivery.",
})

export const deliveryValidatedEventType = defineMessageEventType({
    type: "ticket-delivery-validated",
    description:
        "The ticket's requester validated the delivery: the ticket is closed, done.",
})

export const deliveryRefusedEventType = defineMessageEventType({
    type: "ticket-delivery-refused",
    description:
        "The ticket's requester refused the delivery, saying why: the assignee has the hand again.",
})

export const ticketFailedEventType = defineMessageEventType({
    type: "ticket-failed",
    description:
        "The director closed the ticket, failed, saying why: its request won't be met.",
})

export const ticketCancelledEventType = defineMessageEventType({
    type: "ticket-cancelled",
    description:
        "The ticket's requester withdrew its request, saying why: the ticket is closed, cancelled.",
})
