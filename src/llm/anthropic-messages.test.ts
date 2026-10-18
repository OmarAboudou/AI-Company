import { describe, expect, test } from "bun:test"
import type Anthropic from "@anthropic-ai/sdk"
import type { Message } from "../message/message.ts"
import { anthropicTurns } from "./anthropic-messages.ts"

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
    test("gives others' messages as user turns, after a header", () => {
        const turns = anthropicTurns([question], "claude-senior", new Map())
        const header =
            "From: Omar Aboudou, Director (@director), 2026-10-18 14:03 UTC"

        expect(turns).toEqual([
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `${header}\n\n@backend-developer Hono or Express?`,
                    },
                ],
            },
        ])
    })

    test("gives the employee's own messages as assistant turns", () => {
        const turns = anthropicTurns(
            [question, answer, thanks],
            "claude-senior",
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
            "claude-senior",
            new Map([["2", replayed]]),
        )

        expect(turns[1]?.content).toEqual(replayed)
    })

    test("keeps consecutive messages of others in one turn, apart", () => {
        const second = message("2", question, "Or Fastify?")

        const turns = anthropicTurns(
            [question, second],
            "claude-senior",
            new Map(),
        )

        expect(turns).toHaveLength(1)
        expect(turns[0]?.content).toHaveLength(2)
    })

    test("sees another employee's messages as someone else's", () => {
        const turns = anthropicTurns(
            [question, answer],
            "claude-junior",
            new Map(),
        )

        expect(turns.map(({ role }) => role)).toEqual(["user"])
        expect(turns[0]?.content).toHaveLength(2)
    })
})
