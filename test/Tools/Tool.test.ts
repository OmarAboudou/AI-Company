import { test, expect, describe } from "bun:test"
import z from "zod"
import { defineTool, isToolDefinition } from "../../src/Tools/Tool"

const validTool = defineTool({
    name: "valid",
    description: "a valid tool",
    parameters: z.object({ x: z.number() }),
    execute: async ({ x }) => x * 2,
})

describe("isToolDefinition", () => {
    test("accepts a tool built with defineTool", () => {
        expect(isToolDefinition(validTool)).toBe(true)
    })

    test("accepts a tool that also defines resultToMarkdown", () => {
        const tool = {
            ...validTool,
            resultToMarkdown: (result: number) => `**${result}**`,
        }

        expect(isToolDefinition(tool)).toBe(true)
    })

    test("rejects undefined (a module with no default export)", () => {
        expect(isToolDefinition(undefined)).toBe(false)
    })

    test("rejects an object with missing fields", () => {
        expect(isToolDefinition({ name: "a", description: "b" })).toBe(false)
    })

    test("rejects parameters that are not a zod schema", () => {
        const tool = { ...validTool, parameters: { x: "number" } }

        expect(isToolDefinition(tool)).toBe(false)
    })

    test("rejects execute that is not a function", () => {
        const tool = { ...validTool, execute: "not a function" }

        expect(isToolDefinition(tool)).toBe(false)
    })

    test("rejects resultToMarkdown that is not a function", () => {
        const tool = { ...validTool, resultToMarkdown: "not a function" }

        expect(isToolDefinition(tool)).toBe(false)
    })
})
