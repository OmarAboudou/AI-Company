import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { defineTool } from "./define-tool.ts"
import { getToolDefinitions } from "./get-tool-definitions.ts"

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

describe("getToolDefinitions", () => {
    test("describes each tool's input as JSON Schema, as the caller writes it", () => {
        const [definition] = getToolDefinitions({ thread_reply: replyTool })

        expect(definition).toEqual({
            name: "thread_reply",
            description: "Reply in the thread.",
            inputSchema: {
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

        const toolNames = getToolDefinitions(tools).map(({ name }) => name)

        expect(toolNames).toEqual(["task_done", "thread_reply"])
    })
})
