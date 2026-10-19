import { describe, expect, test } from "bun:test"
import type Anthropic from "@anthropic-ai/sdk"
import type { Message } from "../../message/message.ts"
import { anthropicTurns } from "./get-anthropic-turns.ts"

const director = { id: "director", title: "Director" }
const developer = { id: "backend-developer", title: "Backend Developer" }
const claude = { id: "claude-senior", name: "Claude Senior" }

function message(
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

const question = message(
    "1",
    { position: director },
    "@backend-developer Hono or Express?",
)
const answer = message("2", { position: developer, employee: claude }, "Hono.")
const thanks = message("3", { position: director }, "Thanks!")

describe("anthropicTurns", () => {
    test("gives others' messages as user turns, in a message tag", () => {
        const turns = anthropicTurns([question], claude, new Map())
        const text = [
            '<message from="Omar Aboudou" position="Director (@director)" sent="2026-10-18 14:03 UTC">',
            "@backend-developer Hono or Express?",
            "</message>",
        ].join("\n")

        expect(turns).toEqual([
            { role: "user", content: [{ type: "text", text }] },
        ])
    })

    test("escapes quotes in the tag's attributes", () => {
        const quoted = { id: "growth", title: 'Head of "Growth"' }
        const memo = message("4", { position: quoted }, "Numbers are up.")

        const turns = anthropicTurns([memo], claude, new Map())

        expect(turns[0]?.content).toEqual([
            {
                type: "text",
                text: expect.stringContaining(
                    'position="Head of &quot;Growth&quot; (@growth)"',
                ),
            },
        ])
    })

    test("gives the employee's own messages as assistant turns", () => {
        const turns = anthropicTurns(
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
        const replayed: Anthropic.ContentBlockParam[] = [
            { type: "thinking", thinking: "", signature: "sig" },
            { type: "text", text: "Hono." },
        ]

        const turns = anthropicTurns(
            [question, answer],
            claude,
            new Map([["2", replayed]]),
        )

        expect(turns[1]?.content).toEqual(replayed)
    })

    test("keeps consecutive messages of others in one turn, apart", () => {
        const second = message("2", question, "Or Fastify?")

        const turns = anthropicTurns([question, second], claude, new Map())

        expect(turns).toHaveLength(1)
        expect(turns[0]?.content).toHaveLength(2)
    })

    test("recognizes its messages written under a former id", () => {
        const renamed = {
            id: "claude-lead",
            formerIds: [{ id: "claude-senior", until: "2026-10-19T09:00:00Z" }],
        }

        const turns = anthropicTurns([question, answer], renamed, new Map())

        expect(turns.map(({ role }) => role)).toEqual(["user", "assistant"])
    })

    test("sees a former holder's messages as someone else's", () => {
        const rehired = { ...claude, createdAt: "2026-10-19T09:00:00Z" }

        const turns = anthropicTurns([question, answer], rehired, new Map())

        expect(turns.map(({ role }) => role)).toEqual(["user"])
    })

    test("sees another employee's messages as someone else's", () => {
        const turns = anthropicTurns(
            [question, answer],
            { id: "claude-junior" },
            new Map(),
        )

        expect(turns.map(({ role }) => role)).toEqual(["user"])
        expect(turns[0]?.content).toHaveLength(2)
    })
})
