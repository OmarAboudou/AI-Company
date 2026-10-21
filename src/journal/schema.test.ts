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
