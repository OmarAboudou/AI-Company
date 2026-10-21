import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { UserError } from "../../user-error.ts"
import { defineTool } from "./define-tool.ts"
import { exampleToolContext } from "./example-tool-context.testing.ts"
import { runToolCall } from "./run-tool-call.ts"

const greetingTool = defineTool({
    description: "Greet someone.",
    inputSchema: z.strictObject({ name: z.string().min(1) }),
    execute: async ({ name }) => {
        if (name === "nobody") {
            throw new UserError("Greet somebody: give a person's name.")
        }
        return { text: `Hello, ${name}.` }
    },
})

const tools = { greeting_say: greetingTool }

describe("runToolCall", () => {
    test("runs the tool on its input, and gives back its text", async () => {
        const call = { name: "greeting_say", input: { name: "Julie" } }

        const result = await runToolCall(tools, call, exampleToolContext)

        expect(result).toEqual({ text: "Hello, Julie.", isError: false })
    })

    test("refuses an unknown tool, naming those it can call", async () => {
        const call = { name: "greeting_shout", input: { name: "Julie" } }

        const result = await runToolCall(tools, call, exampleToolContext)

        const toolListSentence = "The tools you can call are: greeting_say."
        expect(result.isError).toBe(true)
        expect(result.text).toContain(toolListSentence)
    })

    test("refuses an input its schema rejects, saying what to fix", async () => {
        const call = { name: "greeting_say", input: { name: "" } }

        const result = await runToolCall(tools, call, exampleToolContext)

        expect(result.isError).toBe(true)
        expect(result.text).toStartWith("Invalid input for greeting_say:\n")
        expect(result.text).toContain("at name")
        expect(result.text).toEndWith("Fix it, then call greeting_say again.")
    })

    test("gives the tool's refusal back as an error", async () => {
        const call = { name: "greeting_say", input: { name: "nobody" } }

        const result = await runToolCall(tools, call, exampleToolContext)

        expect(result).toEqual({
            text: "Greet somebody: give a person's name.",
            isError: true,
        })
    })

    test("lets any other error through", async () => {
        const failingTool = defineTool({
            ...greetingTool,
            execute: async () => {
                throw new Error("disk full")
            },
        })
        const failingTools = { greeting_say: failingTool }
        const call = { name: "greeting_say", input: { name: "Julie" } }

        const running = runToolCall(failingTools, call, exampleToolContext)

        await expect(running).rejects.toThrow("disk full")
    })
})
