import { describe, expect, test } from "bun:test"
import type Anthropic from "@anthropic-ai/sdk"
import type { Message } from "../../messaging/message/schema.ts"
import { getAnthropicTurns } from "./get-anthropic-turns.ts"

const director = { id: "director", title: "Director" }
const developer = { id: "backend-developer", title: "Backend Developer" }
const claude = { id: "claude-senior", name: "Claude Senior" }

function createMessage(
    id: string,
    author: Pick<Message, "position" | "employee">,
    body: string,
): Message {
    return {
        threadId: "2026-10-18-choice-of-framework",
        id,
        ...author,
        committer: { name: "Omar Aboudou", email: "omar@example.com" },
        mentions: [],
        sentAt: "2026-10-18T14:03:22.123Z",
        body,
    }
}

const question = createMessage(
    "1",
    { position: director },
    "@backend-developer Hono or Express?",
)
const answer = createMessage(
    "2",
    { position: developer, employee: claude },
    "Hono.",
)
const thanks = createMessage("3", { position: director }, "Thanks!")

describe("getAnthropicTurns", () => {
    test("gives others' messages as user turns, in a message tag", () => {
        const turns = getAnthropicTurns([question], claude, new Map())
        const taggedQuestion = [
            '<message number="1" from="Omar Aboudou" position="Director (@director)" sent="2026-10-18 14:03 UTC">',
            "@backend-developer Hono or Express?",
            "</message>",
        ].join("\n")

        expect(turns).toEqual([
            { role: "user", content: [{ type: "text", text: taggedQuestion }] },
        ])
    })

    test("gives the employee's own messages as assistant turns", () => {
        const turns = getAnthropicTurns(
            [question, answer, thanks],
            claude,
            new Map(),
        )

        expect(turns.map(({ role }) => role)).toEqual([
            "user",
            "assistant",
            "user",
        ])
        expect(turns[1]?.content).toEqual([{ type: "text", text: "Hono." }])
    })

    test("replays the employee's own messages exactly when it can", () => {
        const replayedContent: Anthropic.ContentBlockParam[] = [
            { type: "thinking", thinking: "", signature: "sig" },
            { type: "text", text: "Hono." },
        ]

        const turns = getAnthropicTurns(
            [question, answer],
            claude,
            new Map([["2", replayedContent]]),
        )

        expect(turns[1]?.content).toEqual(replayedContent)
    })

    test("keeps consecutive messages of others in one turn, apart", () => {
        const secondQuestion = createMessage("2", question, "Or Fastify?")

        const turns = getAnthropicTurns(
            [question, secondQuestion],
            claude,
            new Map(),
        )

        expect(turns).toHaveLength(1)
        expect(turns[0]?.content).toHaveLength(2)
    })

    test("recognizes its messages written under a former id", () => {
        const renamedEmployee = {
            id: "claude-lead",
            formerIds: [{ id: "claude-senior", until: "2026-10-19T09:00:00Z" }],
        }

        const turns = getAnthropicTurns(
            [question, answer],
            renamedEmployee,
            new Map(),
        )

        expect(turns.map(({ role }) => role)).toEqual(["user", "assistant"])
    })

    test("sees a former holder's messages as someone else's", () => {
        const rehiredEmployee = { ...claude, createdAt: "2026-10-19T09:00:00Z" }

        const turns = getAnthropicTurns(
            [question, answer],
            rehiredEmployee,
            new Map(),
        )

        expect(turns.map(({ role }) => role)).toEqual(["user"])
    })

    test("sees another employee's messages as someone else's", () => {
        const turns = getAnthropicTurns(
            [question, answer],
            { id: "claude-junior" },
            new Map(),
        )

        expect(turns.map(({ role }) => role)).toEqual(["user"])
        expect(turns[0]?.content).toHaveLength(2)
    })
})
