import { describe, expect, test } from "bun:test"
import { IdSchema } from "../../ids/id-schema.ts"
import { createMessageId } from "./create-message-id.ts"
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

describe("createMessageId", () => {
    test("is the time of sending with a random suffix", () => {
        const id = createMessageId("2026-10-18T14:03:22.123Z")

        expect(id).toMatch(/^20261018-140322-123-[0-9a-f]{4}$/)
        expect(IdSchema.safeParse(id).success).toBe(true)
    })

    test("differs between two messages sent at the same time", () => {
        const messageIds = new Set(
            Array.from({ length: 20 }, () => createMessageId(question.sentAt)),
        )

        expect(messageIds.size).toBeGreaterThan(1)
    })
})
