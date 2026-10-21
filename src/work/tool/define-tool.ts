import type { z } from "zod"
import type { Task } from "../task/schema.ts"

export type ToolContext = { projectRoot: string; task: Task; runId: string }

export type TaskEnding =
    | { state: "succeeded"; summary: string }
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
