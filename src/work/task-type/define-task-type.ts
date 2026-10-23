import type { z } from "zod"
import type { Journal, JournalEvent } from "../../journal/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import type { Task, TaskResult } from "../task/schema.ts"
import type {
    BuiltInToolName,
    builtInTools,
} from "../tool/built-in/built-in.ts"

export type TaskTypeContext = {
    projectRoot: string
    journal: Journal
    task: Task
    position: Position
    causeEvent: JournalEvent
}

export type BoundToolInputs = {
    [Name in BuiltInToolName]?: Partial<
        z.input<(typeof builtInTools)[Name]["inputSchema"]>
    >
}

export type TaskSession<Result extends TaskResult = TaskResult> = {
    userMessage: string
    toolNames: BuiltInToolName[]
    boundToolInputs?: BoundToolInputs
    result: Result
}

export type TaskRun<Result extends TaskResult = TaskResult> = {
    runId: string
    sessionResult: Result
}

export type TaskType<
    ParamsSchema extends z.ZodType = z.ZodType,
    ResultSchema extends z.ZodType<TaskResult> = z.ZodType<TaskResult>,
> = {
    type: string
    paramsSchema: ParamsSchema
    resultSchema: ResultSchema
    createSession(
        params: z.infer<ParamsSchema>,
        ctx: TaskTypeContext,
    ): Promise<TaskSession<z.infer<ResultSchema>>>
    getRunResult?(
        params: z.infer<ParamsSchema>,
        run: TaskRun<z.infer<ResultSchema>>,
        ctx: TaskTypeContext,
    ): Promise<z.infer<ResultSchema>>
    getCancellationReason?(
        params: z.infer<ParamsSchema>,
        ctx: TaskTypeContext,
    ): Promise<string | undefined>
}

export function defineTaskType<
    ParamsSchema extends z.ZodType,
    ResultSchema extends z.ZodType<TaskResult>,
>(
    taskType: TaskType<ParamsSchema, ResultSchema>,
): TaskType<ParamsSchema, ResultSchema> {
    return taskType
}
