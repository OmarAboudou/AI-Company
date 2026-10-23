import { UserError } from "../../user-error.ts"
import type { Task } from "../task/schema.ts"
import { builtInTaskTypes } from "./built-in/built-in.ts"
import type { TaskType } from "./define-task-type.ts"

export function requireTaskType(task: Task): TaskType {
    const taskType = builtInTaskTypes[task.type]
    if (taskType === undefined) {
        throw new UserError(
            `Task "${task.id}" is of type "${task.type}", which this version of AICo doesn't know: a newer one created it. Update AICo.`,
        )
    }
    return taskType
}
