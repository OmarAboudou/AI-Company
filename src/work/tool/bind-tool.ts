import { z } from "zod"
import type { Tool } from "./define-tool.ts"
import { getToolDescription } from "./get-tool-description.ts"

export function bindTool<InputSchema extends z.ZodObject>(
    tool: Tool<InputSchema>,
    boundInput: Partial<z.input<InputSchema>>,
): Tool {
    if (Object.keys(boundInput).length === 0) {
        return tool
    }
    const freeShape = Object.fromEntries(
        Object.entries(tool.inputSchema.shape).filter(
            ([key]) => !Object.hasOwn(boundInput, key),
        ),
    )
    return {
        description: getToolDescription(tool, boundInput),
        inputSchema: z.strictObject(freeShape),
        execute: (freeInput, ctx) =>
            tool.execute(
                tool.inputSchema.parse({ ...freeInput, ...boundInput }),
                ctx,
            ),
    }
}
