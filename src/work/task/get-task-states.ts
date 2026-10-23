import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { EventType, JournalEvent } from "../../journal/schema.ts"
import {
    type Task,
    taskCreatedEventType,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "./schema.ts"

export type TaskState = "queued" | "running" | "done" | "failed"

type TaskEventContent = Omit<JournalEvent, "id"> & { taskId: string }

const statesAfterEventTypes: [EventType<TaskEventContent>, TaskState][] = [
    [taskCreatedEventType, "queued"],
    [taskStartedEventType, "running"],
    [taskDoneEventType, "done"],
    [taskFailedEventType, "failed"],
]

export function getTaskStates(
    tasks: Task[],
    events: JournalEvent[],
): Map<string, TaskState> {
    const taskStates = new Map<string, TaskState>(
        tasks.map(({ id }) => [id, "queued"]),
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
