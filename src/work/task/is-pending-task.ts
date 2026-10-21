import type { TaskState } from "./get-task-states.ts"
import type { Task } from "./schema.ts"

export function isPendingTask(
    task: Task,
    taskStates: ReadonlyMap<string, TaskState>,
): boolean {
    const state = taskStates.get(task.id)
    return state === "waiting" || state === "running"
}
