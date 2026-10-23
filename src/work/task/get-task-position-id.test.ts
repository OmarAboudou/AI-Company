import { describe, expect, test } from "bun:test"
import { getTaskPositionId } from "./get-task-position-id.ts"
import type { Task } from "./schema.ts"

const developerTask: Task = {
    id: "20261018-140323-000-77aa",
    askedAt: "2026-10-18T14:03:23.000Z",
    type: "example",
    params: { threadId: "2026-10-18-choice-of-framework" },
    positionId: "backend-developer",
    causeEventId: "20261018-140322-123-5d1e",
}

describe("getTaskPositionId", () => {
    test("is the current id of a position renamed since the task", () => {
        const renamedPosition = {
            id: "api-developer",
            formerIds: [
                { id: "backend-developer", until: "2026-10-19T09:00:00.000Z" },
            ],
        }

        const positionId = getTaskPositionId(developerTask, [renamedPosition])

        expect(positionId).toBe("api-developer")
    })

    test("is the task's own position id otherwise", () => {
        const positions = [{ id: "backend-developer" }]

        const positionId = getTaskPositionId(developerTask, positions)

        expect(positionId).toBe("backend-developer")
    })
})
