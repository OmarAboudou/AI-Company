import type { z } from "zod"
import type { Employee } from "../../organization/employee/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import type { Task } from "../task/schema.ts"

export type ToolContext = {
    projectRoot: string
    task: Task
    taskDepth: number
    position: Position
    employee: Employee
    runId: string
}

export type TaskEnding =
    | { state: "done"; summary: string }
    | { state: "failed"; reason: string }

export type ToolResult = { text: string; taskEnding?: TaskEnding }

export type Tool<InputSchema extends z.ZodType = z.ZodType> = {
    description: string
    inputSchema: InputSchema
    execute(input: z.infer<InputSchema>, ctx: ToolContext): Promise<ToolResult>
}

export function defineTool<InputSchema extends z.ZodType>(
    tool: Tool<InputSchema>,
): Tool<InputSchema> {
    return tool
}
