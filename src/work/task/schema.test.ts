import { describe, expect, test } from "bun:test"
import type { EventType } from "../../journal/schema.ts"
import {
    chainStoppedEventType,
    TaskSchema,
    taskCreatedEventType,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "./schema.ts"

const catchUpTask = {
    createdAt: "2026-10-18T14:03:23.000Z",
    type: "catch-up-thread",
    params: { threadId: "2026-10-18-choice-of-framework" },
    positionId: "backend-developer",
    causeEventId: "20261018-140322-123-5d1e",
}

function accepts(task: unknown): boolean {
    return TaskSchema.safeParse(task).success
}

describe("TaskSchema", () => {
    test("accepts a type, parameters, a position and a cause", () => {
        expect(TaskSchema.parse(catchUpTask)).toEqual(catchUpTask)
    })

    test("accepts the task it is a part of", () => {
        const parentTaskId = "20261018-140323-000-77aa"

        expect(accepts({ ...catchUpTask, parentTaskId })).toBe(true)
    })

    test("rejects parameters that aren't an object", () => {
        const params = ["2026-10-18-choice-of-framework"]

        expect(accepts({ ...catchUpTask, params })).toBe(false)
    })

    test("rejects an unknown key, such as a state", () => {
        expect(accepts({ ...catchUpTask, state: "waiting" })).toBe(false)
    })
})

function isAcceptedBy(eventType: EventType, event: unknown): boolean {
    return eventType.recordingSchema.safeParse(event).success
}

describe("the task event types", () => {
    const taskEvent = {
        occurredAt: "2026-10-18T14:03:23.000Z",
        depth: 1,
        taskId: "20261018-140323-000-77aa",
    }

    const runId = "20261018-140324-000-1b2c"

    test.each([
        [taskCreatedEventType, {}],
        [taskStartedEventType, { runId }],
        [taskDoneEventType, { summary: "Answered: Hono, for Bun." }],
        [taskFailedEventType, { reason: "The thread asks nothing." }],
    ])("accept their events, with the task's id", (eventType, fields) => {
        const event = { ...taskEvent, type: eventType.type, ...fields }

        expect(isAcceptedBy(eventType, event)).toBe(true)
    })

    test("require a summary to mark a task as done", () => {
        const event = { ...taskEvent, type: "task-done", summary: " " }

        expect(isAcceptedBy(taskDoneEventType, event)).toBe(false)
    })

    test("require a reason to give a task up", () => {
        const event = { ...taskEvent, type: "task-failed" }

        expect(isAcceptedBy(taskFailedEventType, event)).toBe(false)
    })

    test("accept a run's start, with its employee and model", () => {
        const model = { providerId: "anthropic", modelId: "opus" }
        const event = { ...taskEvent, type: "task-started", runId, model }

        expect(isAcceptedBy(taskStartedEventType, event)).toBe(true)
    })

    test("require the run that starts a task", () => {
        const event = { ...taskEvent, type: "task-started" }

        expect(isAcceptedBy(taskStartedEventType, event)).toBe(false)
    })

    test("accept a run's end, with the tokens it used", () => {
        const usage = {
            inputTokens: 1200,
            outputTokens: 340,
            cacheReadInputTokens: 9000,
            cacheCreationInputTokens: 800,
        }
        const summary = "Answered: Hono, for Bun."
        const event = { ...taskEvent, type: "task-done", summary }

        const runEnd = { ...event, runId, usage }
        expect(isAcceptedBy(taskDoneEventType, runEnd)).toBe(true)
    })
})

describe("chainStoppedEventType", () => {
    const stoppedChain = {
        type: "chain-stopped",
        occurredAt: "2026-10-18T15:00:00.000Z",
        depth: 200,
        causeEventId: "20261018-145959-000-4b1d",
        stoppedTask: {
            type: "catch-up-thread",
            positionId: "qa-tester",
            params: { threadId: "2026-10-18-choice-of-framework" },
        },
    }

    test("accepts a chain stopped, with the task it didn't create", () => {
        expect(isAcceptedBy(chainStoppedEventType, stoppedChain)).toBe(true)
    })

    test("requires the task the chain stopped before", () => {
        const { stoppedTask, ...event } = stoppedChain

        expect(isAcceptedBy(chainStoppedEventType, event)).toBe(false)
    })
})
