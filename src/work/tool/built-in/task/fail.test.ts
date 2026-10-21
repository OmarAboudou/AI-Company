import { describe, expect, test } from "bun:test"
import { exampleToolContext } from "../../example-tool-context.ts"
import { runToolCall } from "../../run-tool-call.ts"
import { taskFailTool } from "./fail.ts"

const tools = { task_fail: taskFailTool }

describe("task_fail", () => {
    test("ends the task as failed, with its reason", async () => {
        const reason = "The thread asks for figures I don't have."
        const call = { name: "task_fail", input: { reason } }

        const result = await runToolCall(tools, call, exampleToolContext)

        expect(result.taskEnding).toEqual({ state: "failed", reason })
    })

    test("requires a reason", async () => {
        const call = { name: "task_fail", input: {} }

        const result = await runToolCall(tools, call, exampleToolContext)

        expect(result.isError).toBe(true)
        expect(result.taskEnding).toBeUndefined()
    })
})
