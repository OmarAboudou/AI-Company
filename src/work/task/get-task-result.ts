import { z } from "zod"
import { UserError } from "../../user-error.ts"
import type { TaskDoneEvent, TaskResult } from "./schema.ts"

export function getTaskResult<Result extends TaskResult>(
    taskDoneEvent: TaskDoneEvent,
    resultReadingSchema: z.ZodType<Result>,
): Result {
    const validation = resultReadingSchema.safeParse(taskDoneEvent.result)
    if (!validation.success) {
        throw new UserError(
            `Invalid .aico/journal/${taskDoneEvent.id}.json, its result:\n${z.prettifyError(validation.error)}`,
        )
    }
    return validation.data
}
