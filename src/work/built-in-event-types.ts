import { messageSentEventType } from "../messaging/message/schema.ts"
import {
    deliveryRefusedEventType,
    deliveryValidatedEventType,
    questionAnsweredEventType,
    questionAskedEventType,
    ticketCancelledEventType,
    ticketDeliveredEventType,
} from "../messaging/ticket/act/schema.ts"
import { ticketCreatedEventType } from "../messaging/ticket/schema.ts"
import { eventsDispatchedEventType } from "./listener/schema.ts"
import {
    taskCancelledEventType,
    taskCreatedEventType,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "./task/schema.ts"

export const builtInEventTypes = [
    ticketCreatedEventType,
    questionAskedEventType,
    questionAnsweredEventType,
    ticketDeliveredEventType,
    deliveryValidatedEventType,
    deliveryRefusedEventType,
    ticketCancelledEventType,
    messageSentEventType,
    taskCreatedEventType,
    taskStartedEventType,
    taskDoneEventType,
    taskFailedEventType,
    taskCancelledEventType,
    eventsDispatchedEventType,
] as const
