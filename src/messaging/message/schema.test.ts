import { describe, expect, test } from "bun:test"
import { MessageConfigSchema, messageSentEventType } from "./schema.ts"

const question = {
    position: { id: "founder", title: "Founder" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    sentAt: "2026-10-18T14:03:22.123Z",
}

function accepts(config: unknown): boolean {
    return MessageConfigSchema.safeParse(config).success
}

describe("MessageConfigSchema", () => {
    test("accepts a position, committer and date", () => {
        expect(MessageConfigSchema.parse(question)).toEqual(question)
    })

    test("accepts the employee who wrote it", () => {
        const employee = { id: "julie", name: "Julie" }

        expect(accepts({ ...question, employee })).toBe(true)
    })

    test("requires the committer's name and email", () => {
        const committer = { name: "Omar Aboudou" }

        expect(accepts({ ...question, committer })).toBe(false)
    })

    test("rejects a position id that isn't kebab-case", () => {
        const position = { id: "Founder", title: "Founder" }

        expect(accepts({ ...question, position })).toBe(false)
    })

    test("rejects an unknown key, such as the body", () => {
        expect(accepts({ ...question, body: "Hi" })).toBe(false)
    })
})

describe("messageSentEventType", () => {
    const messageSentEvent = {
        type: "message-sent",
        occurredAt: "2026-10-18T14:03:22.123Z",
        depth: 0,
        ticketNumber: 1,
        messageId: "20261018-140322-123-3f9a",
        positionId: "founder",
    }

    function isAccepted(event: unknown): boolean {
        return messageSentEventType.recordingSchema.safeParse(event).success
    }

    test("accepts a message sent, with its ticket, id and author", () => {
        expect(isAccepted(messageSentEvent)).toBe(true)
    })

    test("requires the position it was written from", () => {
        const { positionId, ...anonymousEvent } = messageSentEvent

        expect(isAccepted(anonymousEvent)).toBe(false)
    })

    test("rejects an unknown key, such as the message's body", () => {
        expect(isAccepted({ ...messageSentEvent, body: "Hi" })).toBe(false)
    })

    test("accepts the run that posted the message", () => {
        const runId = "20261018-140324-000-1b2c"

        expect(isAccepted({ ...messageSentEvent, runId })).toBe(true)
    })
})
