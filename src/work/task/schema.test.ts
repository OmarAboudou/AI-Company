import { describe, expect, test } from "bun:test"
import { TaskSchema } from "./schema.ts"

const catchUpTask = {
    createdAt: "2026-10-18T14:03:23.000Z",
    type: "catch-up-thread",
    params: { threadId: "2026-10-18-choice-of-framework" },
    positionId: "backend-developer",
    depth: 1,
    causeEventId: "20261018-140322-123-5d1e",
}

function accepts(task: unknown): boolean {
    return TaskSchema.safeParse(task).success
}

describe("TaskSchema", () => {
    test("accepts a type, parameters, a position, a depth and a cause", () => {
        expect(TaskSchema.parse(catchUpTask)).toEqual(catchUpTask)
    })

    test("accepts the task it is a part of", () => {
        const parentTaskId = "20261018-140323-000-77aa"

        expect(accepts({ ...catchUpTask, parentTaskId })).toBe(true)
    })

    test("rejects a depth of 0, a person's action", () => {
        expect(accepts({ ...catchUpTask, depth: 0 })).toBe(false)
    })

    test("rejects parameters that aren't an object", () => {
        const params = ["2026-10-18-choice-of-framework"]

        expect(accepts({ ...catchUpTask, params })).toBe(false)
    })

    test("rejects an unknown key, such as a state", () => {
        expect(accepts({ ...catchUpTask, state: "waiting" })).toBe(false)
    })
})
