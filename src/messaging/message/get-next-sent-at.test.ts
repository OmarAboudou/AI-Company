import { describe, expect, test } from "bun:test"
import { getNextSentAt } from "./get-next-sent-at.ts"
import type { Message } from "./schema.ts"

const question: Message = {
    ticketNumber: 1,
    id: "20261018-140322-123-3f9a",
    position: { id: "director", title: "Director" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    sentAt: "2026-10-18T14:03:22.123Z",
    body: "Hono or Express?",
}

describe("getNextSentAt", () => {
    test("is now in a discussion without messages", () => {
        const now = new Date("2026-10-18T14:03:22.123Z")

        expect(getNextSentAt([], now)).toBe("2026-10-18T14:03:22.123Z")
    })

    test("comes after the last message, even within its millisecond", () => {
        const now = new Date(question.sentAt)

        expect(getNextSentAt([question], now)).toBe("2026-10-18T14:03:22.124Z")
    })
})
