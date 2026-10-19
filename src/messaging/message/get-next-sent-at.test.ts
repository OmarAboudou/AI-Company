import { describe, expect, test } from "bun:test"
import { nextSentAt } from "./get-next-sent-at.ts"
import type { Message } from "./schema.ts"

const question: Message = {
    threadId: "2026-10-18-choice-of-framework",
    id: "20261018-140322-123-3f9a",
    position: { id: "director", title: "Director" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    mentions: ["backend-developer"],
    sentAt: "2026-10-18T14:03:22.123Z",
    body: "@backend-developer Hono or Express?",
}

describe("nextSentAt", () => {
    test("is now in a thread without messages", () => {
        const now = new Date("2026-10-18T14:03:22.123Z")

        expect(nextSentAt([], now)).toBe("2026-10-18T14:03:22.123Z")
    })

    test("comes after the last message, even within its millisecond", () => {
        const now = new Date(question.sentAt)

        expect(nextSentAt([question], now)).toBe("2026-10-18T14:03:22.124Z")
    })
})
