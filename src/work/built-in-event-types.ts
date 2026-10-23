import { messageSentEventType } from "../messaging/message/schema.ts"
import { ticketCreatedEventType } from "../messaging/ticket/schema.ts"
import { eventsDispatchedEventType } from "./listener/schema.ts"
import {
    taskCreatedEventType,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "./task/schema.ts"

export const builtInEventTypes = [
    ticketCreatedEventType,
    messageSentEventType,
    taskCreatedEventType,
    taskStartedEventType,
    taskDoneEventType,
    taskFailedEventType,
    eventsDispatchedEventType,
] as const
