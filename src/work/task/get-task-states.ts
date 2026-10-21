import type { JournalEvent } from "../../journal/schema.ts"
import type { Task } from "./schema.ts"

export type TaskState = "waiting" | "running" | "succeeded" | "failed"

const statesAfterEvents: Partial<Record<JournalEvent["type"], TaskState>> = {
    "task-created": "waiting",
    "task-started": "running",
    "task-completed": "succeeded",
    "task-failed": "failed",
}

export function getTaskStates(
    tasks: Task[],
    events: JournalEvent[],
): Map<string, TaskState> {
    const taskStates = new Map<string, TaskState>(
        tasks.map(({ id }) => [id, "waiting"]),
    )
    for (const event of events) {
        const stateAfterEvent = statesAfterEvents[event.type]
        if (
            stateAfterEvent !== undefined &&
            "taskId" in event &&
            taskStates.has(event.taskId)
        ) {
            taskStates.set(event.taskId, stateAfterEvent)
        }
    }
    return taskStates
}
