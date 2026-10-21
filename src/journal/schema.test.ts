import { describe, expect, test } from "bun:test"
import {
    chainStoppedEventType,
    type EventType,
    JournalEventSchema,
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
