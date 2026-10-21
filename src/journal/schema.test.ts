import { describe, expect, test } from "bun:test"
import { JournalEventSchema } from "./schema.ts"

const messageSentEvent = {
    type: "message-sent" as const,
    occurredAt: "2026-10-18T14:03:22.123Z",
    depth: 0,
    threadId: "2026-10-18-choice-of-framework",
    messageId: "20261018-140322-123-3f9a",
    mentions: ["backend-developer"],
}

function accepts(event: unknown): boolean {
    return JournalEventSchema.safeParse(event).success
}

describe("JournalEventSchema", () => {
    test("accepts a message sent, with its thread, id and mentions", () => {
        const event = JournalEventSchema.parse(messageSentEvent)

        expect(event).toEqual(messageSentEvent)
    })

    test.each([-1, 0.5])("rejects a depth of %d tasks", (depth) => {
        expect(accepts({ ...messageSentEvent, depth })).toBe(false)
    })

    test("rejects an unknown type", () => {
        const event = { ...messageSentEvent, type: "message-read" }

        expect(accepts(event)).toBe(false)
    })

    test("rejects an unknown key, such as the message's body", () => {
        expect(accepts({ ...messageSentEvent, body: "Hi" })).toBe(false)
    })
})

describe("JournalEventSchema for tasks", () => {
    const taskEvent = {
        occurredAt: "2026-10-18T14:03:23.000Z",
        depth: 1,
        taskId: "20261018-140323-000-77aa",
    }

    test.each([
        { type: "task-created" },
        { type: "task-started" },
        { type: "task-completed", summary: "Answered: Hono, for Bun." },
        { type: "task-failed", reason: "The thread asks nothing." },
    ])("accepts $type with the task's id", (fields) => {
        expect(accepts({ ...taskEvent, ...fields })).toBe(true)
    })

    test("requires a summary to complete a task", () => {
        const event = { ...taskEvent, type: "task-completed", summary: " " }

        expect(accepts(event)).toBe(false)
    })

    test("requires a reason to give a task up", () => {
        expect(accepts({ ...taskEvent, type: "task-failed" })).toBe(false)
    })
})

describe("JournalEventSchema for chains", () => {
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
        expect(accepts(chainStoppedEvent)).toBe(true)
    })

    test("requires the task the chain stopped before", () => {
        const { stoppedTask, ...event } = chainStoppedEvent

        expect(accepts(event)).toBe(false)
    })
})
