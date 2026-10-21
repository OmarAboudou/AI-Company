import { describe, expect, test } from "bun:test"
import type { ToolContext } from "../../define-tool.ts"
import { runToolCall } from "../../run-tool-call.ts"
import { taskCompleteTool } from "./complete.ts"

const ctx: ToolContext = {
    projectRoot: "/tmp/acme",
    task: {
        id: "20261018-140323-000-77aa",
        createdAt: "2026-10-18T14:03:23.000Z",
        type: "catch-up-thread",
        params: { threadId: "2026-10-18-choice-of-framework" },
        positionId: "backend-developer",
        causeEventId: "20261018-140322-123-5d1e",
    },
    runId: "20261018-140324-000-1b2c",
}

const tools = { task_complete: taskCompleteTool }

describe("task_complete", () => {
    test("ends the task as succeeded, with its summary", async () => {
        const summary = "Answered @director: Hono."
        const call = { name: "task_complete", input: { summary } }

        const { taskEnding } = await runToolCall(tools, call, ctx)

        expect(taskEnding).toEqual({ state: "succeeded", summary })
    })

    test("requires a summary", async () => {
        const call = { name: "task_complete", input: { summary: " " } }

        const result = await runToolCall(tools, call, ctx)

        expect(result.isError).toBe(true)
        expect(result.taskEnding).toBeUndefined()
    })
})
