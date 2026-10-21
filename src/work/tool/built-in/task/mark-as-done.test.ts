import { describe, expect, test } from "bun:test"
import { exampleToolContext } from "../../example-tool-context.ts"
import { runToolCall } from "../../run-tool-call.ts"
import { taskMarkAsDoneTool } from "./mark-as-done.ts"

const tools = { "task_mark-as-done": taskMarkAsDoneTool }

describe("task_mark-as-done", () => {
    test("ends the task as done, with its summary", async () => {
        const summary = "Answered @director: Hono."
        const call = { name: "task_mark-as-done", input: { summary } }

        const result = await runToolCall(tools, call, exampleToolContext)

        expect(result.taskEnding).toEqual({ state: "done", summary })
    })

    test("requires a summary", async () => {
        const call = { name: "task_mark-as-done", input: { summary: " " } }

        const result = await runToolCall(tools, call, exampleToolContext)

        expect(result.isError).toBe(true)
        expect(result.taskEnding).toBeUndefined()
    })
})
