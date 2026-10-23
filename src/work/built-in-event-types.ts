import { messageSentEventType } from "../messaging/message/schema.ts"
import {
    taskCreatedEventType,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "./task/schema.ts"

export const builtInEventTypes = [
    messageSentEventType,
    taskCreatedEventType,
    taskStartedEventType,
    taskDoneEventType,
    taskFailedEventType,
] as const
