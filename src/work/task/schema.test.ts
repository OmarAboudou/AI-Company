import { describe, expect, test } from "bun:test"
import type { EventType } from "../../journal/schema.ts"
import {
    TaskSchema,
    taskCreatedEventType,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "./schema.ts"

const exampleTask = {
    askedAt: "2026-10-18T14:03:23.000Z",
    type: "example",
    params: { ticketNumber: 1 },
    positionId: "backend-developer",
    causeEventId: "20261018-140322-123-5d1e",
}

function accepts(task: unknown): boolean {
    return TaskSchema.safeParse(task).success
}

describe("TaskSchema", () => {
    test("accepts a type, parameters, a position and a cause", () => {
        expect(TaskSchema.parse(exampleTask)).toEqual(exampleTask)
    })

    test("accepts the task it is a part of", () => {
        const parentTaskId = "20261018-140323-000-77aa"

        expect(accepts({ ...exampleTask, parentTaskId })).toBe(true)
    })

    test("rejects parameters that aren't an object", () => {
        const params = ["2026-10-18-choice-of-framework"]

        expect(accepts({ ...exampleTask, params })).toBe(false)
    })

    test("rejects an unknown key, such as a state", () => {
        expect(accepts({ ...exampleTask, state: "waiting" })).toBe(false)
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
        [taskStartedEventType, { runId, worker: { kind: "directors" } }],
        [
            taskDoneEventType,
            { summary: "Answered: Hono, for Bun.", result: {} },
        ],
        [taskFailedEventType, { reason: "The ticket asks nothing." }],
    ])("accept their events, with the task's id", (eventType, fields) => {
        const event = { ...taskEvent, type: eventType.type, ...fields }

        expect(isAcceptedBy(eventType, event)).toBe(true)
    })

    test("require a summary to mark a task as done", () => {
        const event = {
            ...taskEvent,
            type: "task-done",
            summary: " ",
            result: {},
        }

        expect(isAcceptedBy(taskDoneEventType, event)).toBe(false)
    })

    test("require the result that the task's type gives", () => {
        const summary = "Answered: Hono, for Bun."
        const event = { ...taskEvent, type: "task-done", summary }

        expect(isAcceptedBy(taskDoneEventType, event)).toBe(false)
    })

    test("require a reason to give a task up", () => {
        const event = { ...taskEvent, type: "task-failed" }

        expect(isAcceptedBy(taskFailedEventType, event)).toBe(false)
    })

    test("accept a run's start, with its employee and model", () => {
        const worker = { kind: "employee", employeeId: "claude" }
        const model = { providerId: "anthropic", modelId: "opus" }
        const event = {
            ...taskEvent,
            type: "task-started",
            runId,
            worker,
            model,
        }

        expect(isAcceptedBy(taskStartedEventType, event)).toBe(true)
    })

    test("require the run that starts a task", () => {
        const worker = { kind: "directors" }
        const event = { ...taskEvent, type: "task-started", worker }

        expect(isAcceptedBy(taskStartedEventType, event)).toBe(false)
    })

    test("require who does the run", () => {
        const event = { ...taskEvent, type: "task-started", runId }

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
        const event = { ...taskEvent, type: "task-done", summary, result: {} }

        const runEnd = { ...event, runId, usage }
        expect(isAcceptedBy(taskDoneEventType, runEnd)).toBe(true)
    })
})
