import { messageSentEventType } from "../messaging/message/schema.ts"
import {
    chainStoppedEventType,
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
    chainStoppedEventType,
] as const
