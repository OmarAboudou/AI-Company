import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { defineTool } from "./define-tool.ts"
import { getToolDescription } from "./get-tool-description.ts"

const inputSchema = z.strictObject({ threadId: z.string(), body: z.string() })

const execute = async () => ({ text: "Replied." })

describe("getToolDescription", () => {
    test("gives a tool's text as it is", () => {
        const replyTool = defineTool({
            description: "Reply in a thread.",
            inputSchema,
            execute,
        })

        expect(getToolDescription(replyTool, { threadId: "x" })).toBe(
            "Reply in a thread.",
        )
    })

    test("builds a tool's description from what is bound", () => {
        const replyTool = defineTool({
            description: ({ threadId }) =>
                threadId === undefined
                    ? "Reply in a thread."
                    : "Reply in this thread.",
            inputSchema,
            execute,
        })

        const freeDescription = getToolDescription(replyTool)
        const boundDescription = getToolDescription(replyTool, {
            threadId: "2026-10-18-stack",
        })

        expect(freeDescription).toBe("Reply in a thread.")
        expect(boundDescription).toBe("Reply in this thread.")
    })
})
