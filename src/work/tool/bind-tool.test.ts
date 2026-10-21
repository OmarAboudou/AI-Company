import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { bindTool } from "./bind-tool.ts"
import { defineTool } from "./define-tool.ts"
import { exampleToolContext } from "./example-tool-context.testing.ts"
import { getToolDefinitions } from "./get-tool-definitions.ts"
import { runToolCall } from "./run-tool-call.ts"

const replyTool = defineTool({
    description: ({ threadId }) =>
        threadId === undefined ? "Reply in a thread." : "Reply in this thread.",
    inputSchema: z.strictObject({
        threadId: z.string().min(1),
        body: z.string(),
    }),
    execute: async ({ threadId, body }) => ({
        text: `Replied "${body}" in ${threadId}.`,
    }),
})

const threadId = "2026-10-18-stack"

const boundTools = { thread_reply: bindTool(replyTool, { threadId }) }

function callBoundReply(input: unknown) {
    const call = { name: "thread_reply", input }
    return runToolCall(boundTools, call, exampleToolContext)
}

describe("bindTool", () => {
    test("leaves the bound inputs out of what the caller fills", () => {
        const [definition] = getToolDefinitions(boundTools)

        expect(definition?.inputSchema).toMatchObject({
            properties: { body: { type: "string" } },
            required: ["body"],
        })
    })

    test("describes the tool as its inputs are bound", () => {
        const [definition] = getToolDefinitions(boundTools)

        expect(definition?.description).toBe("Reply in this thread.")
    })

    test("gives the bound inputs back when the call runs", async () => {
        const result = await callBoundReply({ body: "Hono." })

        expect(result).toEqual({
            text: 'Replied "Hono." in 2026-10-18-stack.',
            isError: false,
        })
    })

    test("refuses a bound input from the caller, saying it is unknown", async () => {
        const otherThreadId = "2026-10-18-budget"

        const result = await callBoundReply({ threadId: otherThreadId })

        expect(result.isError).toBe(true)
        expect(result.text).toContain('Unrecognized key: "threadId"')
    })

    test("keeps the tool as it is when nothing is bound", () => {
        expect(bindTool(replyTool, {})).toBe(replyTool)
    })
})
