import { describe, expect, test } from "bun:test"
import type { Task, TaskDoneEvent } from "../../../task/schema.ts"
import { getLastReadEntryId } from "./get-last-read-entry-id.ts"

const threadId = "2026-10-18-choice-of-framework"
const reader = { positionId: "backend-developer", threadId }
const questionId = "20261018-140322-123-3f9a"
const followUpId = "20261018-140459-000-4d1c"

const firstCatchUp: Task = {
    id: "20261018-140323-000-77aa",
    askedAt: "2026-10-18T14:03:23.000Z",
    type: "catch-up-thread",
    params: { threadId },
    positionId: "backend-developer",
    causeEventId: "20261018-140322-123-5d1e",
}

const secondCatchUp: Task = {
    ...firstCatchUp,
    id: "20261018-140500-000-88bb",
    causeEventId: "20261018-140459-000-6e2f",
}

function createDoneEvent(task: Task, lastReadEntryId?: string): TaskDoneEvent {
    return {
        id: `${task.id}-done`,
        type: "task-done",
        occurredAt: "2026-10-18T14:06:00.000Z",
        depth: 1,
        taskId: task.id,
        summary: "Answered.",
        result: lastReadEntryId === undefined ? {} : { lastReadEntryId },
    }
}

describe("getLastReadEntryId", () => {
    test("is absent until a catch-up of the thread is done", () => {
        const tasks = [firstCatchUp]

        const lastReadEntryId = getLastReadEntryId(tasks, [], [], reader)

        expect(lastReadEntryId).toBeUndefined()
    })

    test("is the entry read by the last catch-up marked as done", () => {
        const tasks = [firstCatchUp, secondCatchUp]
        const events = [
            createDoneEvent(firstCatchUp, questionId),
            createDoneEvent(secondCatchUp, followUpId),
        ]

        const lastReadEntryId = getLastReadEntryId(tasks, events, [], reader)

        expect(lastReadEntryId).toBe(followUpId)
    })

    test("stays when a catch-up is done without reading", () => {
        const tasks = [firstCatchUp, secondCatchUp]
        const events = [
            createDoneEvent(firstCatchUp, questionId),
            createDoneEvent(secondCatchUp),
        ]

        const lastReadEntryId = getLastReadEntryId(tasks, events, [], reader)

        expect(lastReadEntryId).toBe(questionId)
    })

    test("reads a result that a newer llmco gave more fields", () => {
        const doneEvent = createDoneEvent(firstCatchUp, questionId)
        const readAt = "2026-10-18T14:06:00.000Z"
        const extendedResult = { ...doneEvent.result, readAt }
        const events = [{ ...doneEvent, result: extendedResult }]

        const lastReadEntryId = getLastReadEntryId(
            [firstCatchUp],
            events,
            [],
            reader,
        )

        expect(lastReadEntryId).toBe(questionId)
    })

    test("leaves out other positions' and other threads' catch-ups", () => {
        const testerCatchUp = { ...firstCatchUp, positionId: "qa-tester" }
        const budgetCatchUp = {
            ...secondCatchUp,
            params: { threadId: "2026-10-18-budget" },
        }
        const tasks = [testerCatchUp, budgetCatchUp]
        const events = [
            createDoneEvent(testerCatchUp, questionId),
            createDoneEvent(budgetCatchUp, followUpId),
        ]

        const lastReadEntryId = getLastReadEntryId(tasks, events, [], reader)

        expect(lastReadEntryId).toBeUndefined()
    })

    test("follows a position renamed since its catch-up", () => {
        const renamedPosition = {
            id: "api-developer",
            formerIds: [
                { id: "backend-developer", until: "2026-10-19T09:00:00.000Z" },
            ],
        }
        const tasks = [firstCatchUp]
        const events = [createDoneEvent(firstCatchUp, questionId)]
        const renamedReader = { positionId: "api-developer", threadId }

        const lastReadEntryId = getLastReadEntryId(
            tasks,
            events,
            [renamedPosition],
            renamedReader,
        )

        expect(lastReadEntryId).toBe(questionId)
    })
})
