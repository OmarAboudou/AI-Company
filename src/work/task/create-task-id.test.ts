import { describe, expect, test } from "bun:test"
import { IdSchema } from "../../ids/id-schema.ts"
import { createTaskId } from "./create-task-id.ts"

const causeEventId = "20261018-140322-123-5d1e"

const exampleTask = {
    type: "example",
    positionId: "backend-developer",
    params: { threadId: "2026-10-18-choice-of-framework" },
}

describe("createTaskId", () => {
    test("gives the same task the same id, on any machine", () => {
        const firstId = createTaskId(causeEventId, exampleTask)
        const secondId = createTaskId(causeEventId, { ...exampleTask })

        expect(firstId).toBe(secondId)
        expect(IdSchema.safeParse(firstId).success).toBe(true)
    })

    test("starts with its cause's id, so that tasks sort by their cause", () => {
        const taskId = createTaskId(causeEventId, exampleTask)

        expect(taskId).toMatch(/^20261018-140322-123-5d1e-[0-9a-f]{8}$/)
    })

    test("tells apart tasks of other types, positions or parameters", () => {
        const otherTasks = [
            { ...exampleTask, type: "review-thread" },
            { ...exampleTask, positionId: "qa-tester" },
            { ...exampleTask, params: { threadId: "2026-10-18-budget" } },
        ]

        const taskIds = otherTasks.map((task) =>
            createTaskId(causeEventId, task),
        )

        const exampleTaskId = createTaskId(causeEventId, exampleTask)
        expect(new Set([exampleTaskId, ...taskIds]).size).toBe(4)
    })

    test("ignores the order of the parameters' keys", () => {
        const params = { threadId: "2026-10-18-stack", from: 3 }
        const reorderedParams = { from: 3, threadId: "2026-10-18-stack" }

        const taskId = createTaskId(causeEventId, { ...exampleTask, params })
        const reorderedId = createTaskId(causeEventId, {
            ...exampleTask,
            params: reorderedParams,
        })

        expect(taskId).toBe(reorderedId)
    })
})
