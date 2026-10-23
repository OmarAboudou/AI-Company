import { messageSentEventType } from "../messaging/message/schema.ts"
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
} from "../messaging/ticket/act/schema.ts"
import { ticketCreatedEventType } from "../messaging/ticket/schema.ts"
import { eventsDispatchedEventType } from "./listener/schema.ts"
import {
    companyPausedEventType,
    companyRelaunchedEventType,
} from "./pause/schema.ts"
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
    ticketRenouncedEventType,
    ticketGivenBackEventType,
    ticketHandedOverEventType,
    ticketFailedEventType,
    messageSentEventType,
    taskCreatedEventType,
    taskStartedEventType,
    taskDoneEventType,
    taskFailedEventType,
    taskCancelledEventType,
    companyPausedEventType,
    companyRelaunchedEventType,
    eventsDispatchedEventType,
] as const
