import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { bindTool } from "./bind-tool.ts"
import { defineTool } from "./define-tool.ts"
import { exampleToolContext } from "./example-tool-context.testing.ts"
import { getToolDefinitions } from "./get-tool-definitions.ts"
import { runToolCall } from "./run-tool-call.ts"

const replyTool = defineTool({
    description: ({ ticketNumber }) =>
        ticketNumber === undefined
            ? "Reply in a ticket."
            : "Reply in this ticket.",
    inputSchema: z.strictObject({
        ticketNumber: z.int().min(1),
        body: z.string(),
    }),
    execute: async ({ ticketNumber, body }) => ({
        text: `Replied "${body}" in #${ticketNumber}.`,
    }),
})

const ticketNumber = 3

const boundTools = { ticket_reply: bindTool(replyTool, { ticketNumber }) }

function callBoundReply(input: unknown) {
    const call = { name: "ticket_reply", input }
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

        expect(definition?.description).toBe("Reply in this ticket.")
    })

    test("gives the bound inputs back when the call runs", async () => {
        const result = await callBoundReply({ body: "Hono." })

        expect(result).toEqual({
            text: 'Replied "Hono." in #3.',
            isError: false,
        })
    })

    test("refuses a bound input from the caller, saying it is unknown", async () => {
        const otherTicketNumber = 2

        const result = await callBoundReply({ ticketNumber: otherTicketNumber })

        expect(result.isError).toBe(true)
        expect(result.text).toContain('Unrecognized key: "ticketNumber"')
    })

    test("keeps the tool as it is when nothing is bound", () => {
        expect(bindTool(replyTool, {})).toBe(replyTool)
    })
})
