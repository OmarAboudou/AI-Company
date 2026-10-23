import type { z } from "zod"
import type { Journal } from "../../journal/schema.ts"
import type { Employee } from "../../organization/employee/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import type { Task } from "../task/schema.ts"

export type RunWorker =
    | { kind: "employee"; employee: Employee }
    | { kind: "directors" }

export type ToolContext = {
    projectRoot: string
    journal: Journal
    task: Task
    depth: number
    position: Position
    worker: RunWorker
    runId: string
}

export type TaskEnding =
    | { state: "done"; summary: string }
    | { state: "failed"; reason: string }
    | { state: "cancelled"; reason: string }

export type ToolResult = { text: string; taskEnding?: TaskEnding }

export type Tool<InputSchema extends z.ZodObject = z.ZodObject> = {
    description:
        | string
        | ((boundInput: Partial<z.input<InputSchema>>) => string)
    inputSchema: InputSchema
    execute(input: z.infer<InputSchema>, ctx: ToolContext): Promise<ToolResult>
}

export function defineTool<InputSchema extends z.ZodObject>(
    tool: Tool<InputSchema>,
): Tool<InputSchema> {
    return tool
}
