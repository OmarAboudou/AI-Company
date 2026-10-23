import { z } from "zod"
import { UserError } from "../../user-error.ts"
import type { TaskEnding, Tool, ToolContext } from "./define-tool.ts"

export type ToolCall = { name: string; input: unknown }

export type ToolCallResult = {
    text: string
    isError: boolean
    taskEnding?: TaskEnding
    hasPassedHand?: boolean
}

export async function runToolCall(
    tools: Record<string, Tool>,
    { name, input }: ToolCall,
    ctx: ToolContext,
): Promise<ToolCallResult> {
    const tool = tools[name]
    if (tool === undefined) {
        const toolNames = Object.keys(tools).join(", ")
        return {
            text: `There is no tool named ${name}. The tools you can call are: ${toolNames}.`,
            isError: true,
        }
    }
    const validation = tool.inputSchema.safeParse(input)
    if (!validation.success) {
        return {
            text: `Invalid input for ${name}:\n${z.prettifyError(validation.error)}\nFix it, then call ${name} again.`,
            isError: true,
        }
    }
    try {
        return { ...(await tool.execute(validation.data, ctx)), isError: false }
    } catch (error) {
        if (!(error instanceof UserError)) {
            throw error
        }
        return { text: error.message, isError: true }
    }
}
