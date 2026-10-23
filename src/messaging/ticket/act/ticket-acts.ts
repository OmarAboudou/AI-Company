import type { MessageEventType } from "../../message/schema.ts"
import type { TicketOutcome, TicketStatus } from "../schema.ts"
import {
    deliveryRefusedEventType,
    deliveryValidatedEventType,
    questionAnsweredEventType,
    questionAskedEventType,
    ticketCancelledEventType,
    ticketDeliveredEventType,
    ticketFailedEventType,
} from "./schema.ts"

export type TicketAct = {
    eventType: MessageEventType
    actorRole: "requester" | "assignee" | "director"
    action: string
    fromStatuses: TicketStatus[]
    toStatus: TicketStatus
    outcome?: TicketOutcome
}

export const ticketActs = {
    ask: {
        eventType: questionAskedEventType,
        actorRole: "assignee",
        action: "ask a question on",
        fromStatuses: ["open"],
        toStatus: "waiting",
    },
    answer: {
        eventType: questionAnsweredEventType,
        actorRole: "requester",
        action: "answer the question on",
        fromStatuses: ["waiting"],
        toStatus: "open",
    },
    deliver: {
        eventType: ticketDeliveredEventType,
        actorRole: "assignee",
        action: "deliver",
        fromStatuses: ["open"],
        toStatus: "to-validate",
    },
    validate: {
        eventType: deliveryValidatedEventType,
        actorRole: "requester",
        action: "validate the delivery of",
        fromStatuses: ["to-validate"],
        toStatus: "closed",
        outcome: "done",
    },
    refuse: {
        eventType: deliveryRefusedEventType,
        actorRole: "requester",
        action: "refuse the delivery of",
        fromStatuses: ["to-validate"],
        toStatus: "open",
    },
    cancel: {
        eventType: ticketCancelledEventType,
        actorRole: "requester",
        action: "cancel",
        fromStatuses: ["open", "waiting", "to-validate"],
        toStatus: "closed",
        outcome: "cancelled",
    },
    close: {
        eventType: ticketFailedEventType,
        actorRole: "director",
        action: "close",
        fromStatuses: ["open", "waiting", "to-validate"],
        toStatus: "closed",
        outcome: "failed",
    },
} satisfies Record<string, TicketAct>

export type TicketActName = keyof typeof ticketActs
