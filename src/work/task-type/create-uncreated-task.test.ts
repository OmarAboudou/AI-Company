import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { createUncreatedTask } from "./create-uncreated-task.ts"
import { defineTaskType } from "./define-task-type.ts"

const reviewTaskType = defineTaskType({
    type: "review-thread",
    paramsSchema: z.strictObject({ threadId: z.string().min(1) }),
    createSession: async () => ({ kind: "done", summary: "Reviewed." }),
})

describe("createUncreatedTask", () => {
    test("asks for a task of the type, for a position, with its parameters", () => {
        const uncreatedTask = createUncreatedTask(reviewTaskType, {
            positionId: "qa-tester",
            params: { threadId: "2026-10-18-stack" },
        })

        expect(uncreatedTask).toEqual({
            type: "review-thread",
            positionId: "qa-tester",
            params: { threadId: "2026-10-18-stack" },
        })
    })

    test("refuses parameters that the type's schema rejects", () => {
        const creation = () =>
            createUncreatedTask(reviewTaskType, {
                positionId: "qa-tester",
                params: { threadId: "" },
            })

        expect(creation).toThrow(z.ZodError)
    })
})
