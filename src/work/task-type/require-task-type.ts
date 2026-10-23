import { UserError } from "../../user-error.ts"
import type { Task } from "../task/schema.ts"
import type { TaskType } from "./define-task-type.ts"

export function requireTaskType(
    task: Task,
    taskTypes: Record<string, TaskType>,
): TaskType {
    const taskType = taskTypes[task.type]
    if (taskType === undefined) {
        throw new UserError(
            `Task "${task.id}" is of type "${task.type}", which this version of AICo doesn't know: a newer one created it. Update AICo.`,
        )
    }
    return taskType
}
