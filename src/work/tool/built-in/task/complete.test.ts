import { describe, expect, test } from "bun:test"
import { exampleToolContext } from "../../example-tool-context.ts"
import { runToolCall } from "../../run-tool-call.ts"
import { taskCompleteTool } from "./complete.ts"

const tools = { task_complete: taskCompleteTool }

describe("task_complete", () => {
    test("ends the task as succeeded, with its summary", async () => {
        const summary = "Answered @director: Hono."
        const call = { name: "task_complete", input: { summary } }

        const result = await runToolCall(tools, call, exampleToolContext)

        expect(result.taskEnding).toEqual({ state: "succeeded", summary })
    })

    test("requires a summary", async () => {
        const call = { name: "task_complete", input: { summary: " " } }

        const result = await runToolCall(tools, call, exampleToolContext)

        expect(result.isError).toBe(true)
        expect(result.taskEnding).toBeUndefined()
    })
})
