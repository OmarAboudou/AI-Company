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
    ticketGivenBackEventType,
    ticketHandedOverEventType,
    ticketRenouncedEventType,
} from "./schema.ts"

export type TicketAct = {
    eventType: MessageEventType
    actorRole: "requester" | "assignee" | "founder"
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
    renounce: {
        eventType: ticketRenouncedEventType,
        actorRole: "assignee",
        action: "renounce",
        fromStatuses: ["open"],
        toStatus: "to-arbitrate",
    },
    "give-back": {
        eventType: ticketGivenBackEventType,
        actorRole: "founder",
        action: "give back",
        fromStatuses: ["to-arbitrate"],
        toStatus: "open",
    },
    "hand-over": {
        eventType: ticketHandedOverEventType,
        actorRole: "founder",
        action: "hand over",
        fromStatuses: ["open", "waiting", "to-validate", "to-arbitrate"],
        toStatus: "open",
    },
    close: {
        eventType: ticketFailedEventType,
        actorRole: "founder",
        action: "close",
        fromStatuses: ["open", "waiting", "to-validate", "to-arbitrate"],
        toStatus: "closed",
        outcome: "failed",
    },
} satisfies Record<string, TicketAct>

export type TicketActName = keyof typeof ticketActs

// Handing a ticket over also names its new assignee: handOverTicket makes
// that act, and actOnTicket the others, which carry their message alone.
export type MessageActName = Exclude<TicketActName, "hand-over">
