import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { defineTool } from "./define-tool.ts"
import { getToolDescription } from "./get-tool-description.ts"

const inputSchema = z.strictObject({ ticketNumber: z.int(), body: z.string() })

const execute = async () => ({ text: "Replied." })

describe("getToolDescription", () => {
    test("gives a tool's text as it is", () => {
        const replyTool = defineTool({
            description: "Reply in a ticket.",
            inputSchema,
            execute,
        })

        expect(getToolDescription(replyTool, { ticketNumber: 1 })).toBe(
            "Reply in a ticket.",
        )
    })

    test("builds a tool's description from what is bound", () => {
        const replyTool = defineTool({
            description: ({ ticketNumber }) =>
                ticketNumber === undefined
                    ? "Reply in a ticket."
                    : "Reply in this ticket.",
            inputSchema,
            execute,
        })

        const freeDescription = getToolDescription(replyTool)
        const boundDescription = getToolDescription(replyTool, {
            ticketNumber: 3,
        })

        expect(freeDescription).toBe("Reply in a ticket.")
        expect(boundDescription).toBe("Reply in this ticket.")
    })
})
