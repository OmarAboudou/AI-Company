import { describe, expect, test } from "bun:test"
import {
    chainStoppedEventType,
    type EventType,
    JournalEventSchema,
    messageSentEventType,
    taskCompletedEventType,
    taskCreatedEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "./schema.ts"

const threadClosedEvent = {
    type: "thread-closed",
    occurredAt: "2026-10-18T14:03:22.123Z",
    depth: 0,
    threadId: "2026-10-18-choice-of-framework",
}

function accepts(event: unknown): boolean {
    return JournalEventSchema.safeParse(event).success
}

function isAcceptedBy(eventType: EventType, event: unknown): boolean {
    return eventType.schema.safeParse(event).success
}

describe("JournalEventSchema", () => {
    test("accepts an event of any type, with the fields of its type", () => {
        const event = JournalEventSchema.parse(threadClosedEvent)

        expect(event).toEqual(threadClosedEvent)
    })

    test.each([-1, 0.5])("rejects a depth of %d tasks", (depth) => {
        expect(accepts({ ...threadClosedEvent, depth })).toBe(false)
    })

    test("requires a type, the time it happened and a depth", () => {
        const { depth, ...eventWithoutDepth } = threadClosedEvent
        const eventWithInvalidType = { ...threadClosedEvent, type: "Closed" }

        expect(accepts(eventWithoutDepth)).toBe(false)
        expect(accepts(eventWithInvalidType)).toBe(false)
    })
})

describe("messageSentEventType", () => {
    const messageSentEvent = {
        ...threadClosedEvent,
        type: "message-sent",
        messageId: "20261018-140322-123-3f9a",
        mentions: ["backend-developer"],
    }

    test("accepts a message sent, with its thread, id and mentions", () => {
        expect(isAcceptedBy(messageSentEventType, messageSentEvent)).toBe(true)
    })

    test("rejects an unknown key, such as the message's body", () => {
        const event = { ...messageSentEvent, body: "Hi" }

        expect(isAcceptedBy(messageSentEventType, event)).toBe(false)
    })
})

describe("the task event types", () => {
    const taskEvent = {
        occurredAt: "2026-10-18T14:03:23.000Z",
        depth: 1,
        taskId: "20261018-140323-000-77aa",
    }

    test.each([
        [taskCreatedEventType, {}],
        [taskStartedEventType, {}],
        [taskCompletedEventType, { summary: "Answered: Hono, for Bun." }],
        [taskFailedEventType, { reason: "The thread asks nothing." }],
    ])("accept their events, with the task's id", (eventType, fields) => {
        const event = { ...taskEvent, type: eventType.type, ...fields }

        expect(isAcceptedBy(eventType, event)).toBe(true)
    })

    test("require a summary to complete a task", () => {
        const event = { ...taskEvent, type: "task-completed", summary: " " }

        expect(isAcceptedBy(taskCompletedEventType, event)).toBe(false)
    })

    test("require a reason to give a task up", () => {
        const event = { ...taskEvent, type: "task-failed" }

        expect(isAcceptedBy(taskFailedEventType, event)).toBe(false)
    })
})

describe("chainStoppedEventType", () => {
    const chainStoppedEvent = {
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
        expect(isAcceptedBy(chainStoppedEventType, chainStoppedEvent)).toBe(
            true,
        )
    })

    test("requires the task the chain stopped before", () => {
        const { stoppedTask, ...event } = chainStoppedEvent

        expect(isAcceptedBy(chainStoppedEventType, event)).toBe(false)
    })
})
