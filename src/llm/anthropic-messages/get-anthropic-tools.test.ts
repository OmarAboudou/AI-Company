import { describe, expect, test } from "bun:test"
import { getAnthropicTools } from "./get-anthropic-tools.ts"

describe("getAnthropicTools", () => {
    test("gives each tool's name, description and input schema, in order", () => {
        const inputSchema = {
            type: "object" as const,
            properties: { body: { type: "string" } },
            required: ["body"],
        }
        const tools = [
            { name: "message_send", description: "Send.", inputSchema },
            { name: "ticket_show", description: "Show.", inputSchema },
        ]

        expect(getAnthropicTools(tools)).toEqual([
            {
                name: "message_send",
                description: "Send.",
                input_schema: inputSchema,
            },
            {
                name: "ticket_show",
                description: "Show.",
                input_schema: inputSchema,
            },
        ])
    })
})
