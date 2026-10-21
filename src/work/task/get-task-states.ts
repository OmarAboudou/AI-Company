import type { z } from "zod"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import {
    type EventType,
    type JournalEvent,
    taskCompletedEventType,
    taskCreatedEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "../../journal/schema.ts"
import type { Task } from "./schema.ts"

export type TaskState = "waiting" | "running" | "succeeded" | "failed"

const statesAfterEventTypes: [
    EventType<z.ZodType<{ taskId: string }>>,
    TaskState,
][] = [
    [taskCreatedEventType, "waiting"],
    [taskStartedEventType, "running"],
    [taskCompletedEventType, "succeeded"],
    [taskFailedEventType, "failed"],
]

export function getTaskStates(
    tasks: Task[],
    events: JournalEvent[],
): Map<string, TaskState> {
    const taskStates = new Map<string, TaskState>(
        tasks.map(({ id }) => [id, "waiting"]),
    )
    for (const event of events) {
        for (const [eventType, stateAfterEvent] of statesAfterEventTypes) {
            const taskEvent = getEventOfType(event, eventType)
            if (taskEvent !== undefined && taskStates.has(taskEvent.taskId)) {
                taskStates.set(taskEvent.taskId, stateAfterEvent)
            }
        }
    }
    return taskStates
}
