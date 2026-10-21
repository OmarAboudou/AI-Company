import { z } from "zod"
import { UserError } from "../../user-error.ts"
import type { Task } from "../task/schema.ts"
import type { TaskType } from "./define-task-type.ts"

export function parseTaskParams(task: Task, taskType: TaskType): unknown {
    const validation = taskType.paramsSchema.safeParse(task.params)
    if (!validation.success) {
        throw new UserError(
            `Invalid .llmco/tasks/${task.id}.json:\n${z.prettifyError(validation.error)}`,
        )
    }
    return validation.data
}
