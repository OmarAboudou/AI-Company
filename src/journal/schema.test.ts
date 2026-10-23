import { describe, expect, test } from "bun:test"
import { JournalEventSchema } from "./schema.ts"

const ticketStarredEvent = {
    type: "ticket-starred",
    occurredAt: "2026-10-18T14:03:22.123Z",
    depth: 0,
    ticketNumber: 1,
}

function accepts(event: unknown): boolean {
    return JournalEventSchema.safeParse(event).success
}

describe("JournalEventSchema", () => {
    test("accepts an event of any type, with the fields of its type", () => {
        const event = JournalEventSchema.parse(ticketStarredEvent)

        expect(event).toEqual(ticketStarredEvent)
    })

    test.each([-1, 0.5])("rejects a depth of %d tasks", (depth) => {
        expect(accepts({ ...ticketStarredEvent, depth })).toBe(false)
    })

    test("requires a type, the time it happened and a depth", () => {
        const { depth, ...eventWithoutDepth } = ticketStarredEvent
        const eventWithInvalidType = { ...ticketStarredEvent, type: "Closed" }

        expect(accepts(eventWithoutDepth)).toBe(false)
        expect(accepts(eventWithInvalidType)).toBe(false)
    })
})
