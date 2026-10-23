import { IdSchema } from "../../../ids/id-schema.ts"
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
        "The founder closed the ticket, failed, saying why: its request won't be met.",
})

export const ticketRenouncedEventType = defineMessageEventType({
    type: "ticket-renounced",
    description:
        "The ticket's assignee renounced, saying what went wrong: the company pauses, and the founder arbitrates.",
})

export const ticketGivenBackEventType = defineMessageEventType({
    type: "ticket-given-back",
    description:
        "The founder gave the renounced ticket back to its assignee, saying what was readjusted: the assignee has the hand again.",
})

export const ticketHandedOverEventType = defineMessageEventType({
    type: "ticket-handed-over",
    description:
        "The founder handed the ticket over to another position, saying why: its new assignee has the hand.",
    fields: {
        assigneePositionId: IdSchema.meta({
            description:
                "Id of the ticket's new assignee, as the position was called then.",
        }),
    },
})

export const ticketCancelledEventType = defineMessageEventType({
    type: "ticket-cancelled",
    description:
        "The ticket's requester withdrew its request, saying why: the ticket is closed, cancelled.",
})
