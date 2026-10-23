import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { createUncreatedTask } from "./create-uncreated-task.ts"
import { defineTaskType } from "./define-task-type.ts"

const reviewTaskType = defineTaskType({
    type: "review-ticket",
    paramsSchema: z.strictObject({ ticketNumber: z.int().min(1) }),
    resultSchema: z.strictObject({}),
    createSession: async () => ({
        kind: "done",
        summary: "Reviewed.",
        result: {},
    }),
})

describe("createUncreatedTask", () => {
    test("asks for a task of the type, for a position, with its parameters", () => {
        const uncreatedTask = createUncreatedTask(reviewTaskType, {
            positionId: "qa-tester",
            params: { ticketNumber: 3 },
        })

        expect(uncreatedTask).toEqual({
            type: "review-ticket",
            positionId: "qa-tester",
            params: { ticketNumber: 3 },
        })
    })

    test("refuses parameters that the type's schema rejects", () => {
        const creation = () =>
            createUncreatedTask(reviewTaskType, {
                positionId: "qa-tester",
                params: { ticketNumber: 0 },
            })

        expect(creation).toThrow(z.ZodError)
    })
})
