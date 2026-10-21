import { z } from "zod"
import type { ToolDefinition } from "../../llm/conversation/schema.ts"
import type { Tool } from "./define-tool.ts"

export function getToolDefinitions(
    tools: Record<string, Tool>,
): ToolDefinition[] {
    return Object.entries(tools)
        .sort(([name], [otherName]) => name.localeCompare(otherName))
        .map(([name, { description, inputSchema }]) => {
            const { $schema, ...jsonSchema } = z.toJSONSchema(inputSchema, {
                io: "input",
            })
            return { name, description, inputSchema: jsonSchema }
        })
}
