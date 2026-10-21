import type Anthropic from "@anthropic-ai/sdk"
import type { ToolDefinition } from "../conversation/schema.ts"

export function getAnthropicTools(tools: ToolDefinition[]): Anthropic.Tool[] {
    return tools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        input_schema: inputSchema as Anthropic.Tool.InputSchema,
    }))
}
