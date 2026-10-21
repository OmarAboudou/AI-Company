import type { z } from "zod"
import type { UncreatedTask } from "../task/schema.ts"
import type { TaskType } from "./define-task-type.ts"

export function createUncreatedTask<
    ParamsSchema extends z.ZodType<Record<string, unknown>>,
>(
    taskType: TaskType<ParamsSchema>,
    {
        positionId,
        params,
    }: { positionId: string; params: z.input<ParamsSchema> },
): UncreatedTask {
    return {
        type: taskType.type,
        positionId,
        params: taskType.paramsSchema.parse(params),
    }
}
