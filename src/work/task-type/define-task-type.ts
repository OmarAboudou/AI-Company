import type { z } from "zod"
import type { JournalEvent } from "../../journal/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import type { Task } from "../task/schema.ts"
import type { BuiltInToolName } from "../tool/built-in/built-in.ts"

export type TaskTypeContext = {
    projectRoot: string
    task: Task
    position: Position
    causeEvent: JournalEvent
}

export type TaskSession =
    | { kind: "run"; userMessage: string; toolNames: BuiltInToolName[] }
    | { kind: "done"; summary: string }

export type TaskType<ParamsSchema extends z.ZodType = z.ZodType> = {
    paramsSchema: ParamsSchema
    createSession(
        params: z.infer<ParamsSchema>,
        ctx: TaskTypeContext,
    ): Promise<TaskSession>
}

export function defineTaskType<ParamsSchema extends z.ZodType>(
    taskType: TaskType<ParamsSchema>,
): TaskType<ParamsSchema> {
    return taskType
}
