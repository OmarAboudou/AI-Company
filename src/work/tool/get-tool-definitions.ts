import { z } from "zod"
import type { ToolDefinition } from "../../llm/conversation/schema.ts"
import type { Tool } from "./define-tool.ts"
import { getToolDescription } from "./get-tool-description.ts"

export function getToolDefinitions(
    tools: Record<string, Tool>,
): ToolDefinition[] {
    return Object.entries(tools)
        .sort(([name], [otherName]) => name.localeCompare(otherName))
        .map(([name, tool]) => {
            const { $schema, ...jsonSchema } = z.toJSONSchema(
                tool.inputSchema,
                { io: "input" },
            )
            const description = getToolDescription(tool)
            return { name, description, inputSchema: jsonSchema }
        })
}
