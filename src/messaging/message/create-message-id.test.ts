import { describe, expect, test } from "bun:test"
import { IdSchema } from "../../ids/id-schema.ts"
import { newMessageId } from "./create-message-id.ts"
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

describe("newMessageId", () => {
    test("is the time of sending with a random suffix", () => {
        const id = newMessageId("2026-10-18T14:03:22.123Z")

        expect(id).toMatch(/^20261018-140322-123-[0-9a-f]{4}$/)
        expect(IdSchema.safeParse(id).success).toBe(true)
    })

    test("differs between two messages sent at the same time", () => {
        const ids = new Set(
            Array.from({ length: 20 }, () => newMessageId(question.sentAt)),
        )

        expect(ids.size).toBeGreaterThan(1)
    })
})
