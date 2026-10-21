import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import type { Tool } from "../tool/define-tool.ts"

export function getAnthropicTools(
    tools: Record<string, Tool>,
): Anthropic.Tool[] {
    return Object.entries(tools)
        .sort(([name], [otherName]) => name.localeCompare(otherName))
        .map(([name, { description, inputSchema }]) => {
            const { $schema, ...input_schema } = z.toJSONSchema(inputSchema, {
                io: "input",
            })
            return {
                name,
                description,
                input_schema: input_schema as Anthropic.Tool.InputSchema,
            }
        })
}
