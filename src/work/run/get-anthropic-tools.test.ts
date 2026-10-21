import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { defineTool } from "../tool/define-tool.ts"
import { getAnthropicTools } from "./get-anthropic-tools.ts"

const replyTool = defineTool({
    description: "Reply in the thread.",
    inputSchema: z.strictObject({
        body: z.string().meta({ description: "The reply, in Markdown." }),
        isUrgent: z.boolean().default(false),
    }),
    execute: async () => ({ text: "Replied." }),
})

const doneTool = defineTool({
    description: "Say the work is done.",
    inputSchema: z.strictObject({}),
    execute: async () => ({ text: "Done." }),
})

describe("getAnthropicTools", () => {
    test("describes each tool's input as JSON Schema, as the model writes it", () => {
        const [anthropicTool] = getAnthropicTools({ thread_reply: replyTool })

        expect(anthropicTool).toEqual({
            name: "thread_reply",
            description: "Reply in the thread.",
            input_schema: {
                type: "object",
                properties: {
                    body: {
                        type: "string",
                        description: "The reply, in Markdown.",
                    },
                    isUrgent: { type: "boolean", default: false },
                },
                required: ["body"],
                additionalProperties: false,
            },
        })
    })

    test("sorts the tools by name, so that the prompt cache keeps them", () => {
        const tools = { thread_reply: replyTool, task_done: doneTool }

        const toolNames = getAnthropicTools(tools).map(({ name }) => name)

        expect(toolNames).toEqual(["task_done", "thread_reply"])
    })
})
