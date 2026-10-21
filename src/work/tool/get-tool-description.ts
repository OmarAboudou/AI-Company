import type { z } from "zod"
import type { Tool } from "./define-tool.ts"

export function getToolDescription<InputSchema extends z.ZodObject>(
    { description }: Tool<InputSchema>,
    boundInput: Partial<z.input<InputSchema>> = {},
): string {
    return typeof description === "function"
        ? description(boundInput)
        : description
}
