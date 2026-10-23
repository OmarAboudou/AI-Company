import { describe, expect, test } from "bun:test"
import { formatTaggedMessage } from "./format-tagged-message.ts"
import type { Message } from "./schema.ts"

const question: Message = {
    ticketNumber: 1,
    id: "20261018-140322-123-3f9a",
    position: { id: "founder", title: "Founder" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    sentAt: "2026-10-18T14:03:22.123Z",
    body: "Hono or Express?\n",
}

describe("formatTaggedMessage", () => {
    test("tags a message with its number, author, position and time", () => {
        const taggedQuestion = formatTaggedMessage(question, 5)

        expect(taggedQuestion).toBe(
            [
                '<message number="5" from="Omar Aboudou" position="Founder (@founder)" sent="2026-10-18 14:03 UTC">',
                "Hono or Express?",
                "</message>",
            ].join("\n"),
        )
    })

    test("names an employee's message after the employee", () => {
        const answer: Message = {
            ...question,
            position: { id: "backend-developer", title: "Backend Developer" },
            employee: { id: "claude-senior", name: "Claude Senior" },
        }

        const taggedAnswer = formatTaggedMessage(answer, 6)

        expect(taggedAnswer).toStartWith(
            '<message number="6" from="Claude Senior" position="Backend Developer (@backend-developer)"',
        )
    })

    test("escapes quotes in the tag's attributes", () => {
        const memo: Message = {
            ...question,
            position: { id: "growth", title: 'Head of "Growth"' },
        }

        const taggedMemo = formatTaggedMessage(memo, 7)

        expect(taggedMemo).toContain(
            'position="Head of &quot;Growth&quot; (@growth)"',
        )
    })
})
