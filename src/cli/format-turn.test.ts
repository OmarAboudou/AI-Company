import { describe, expect, test } from "bun:test"
import { formatTurn } from "./format-turn.ts"

const askCall = {
    type: "tool-call" as const,
    id: "call_8f3a2b1c9d0e",
    name: "ticket_ask",
    input: { body: "Which build?" },
}

function createAnswer(text: string, isError = false) {
    return {
        role: "user" as const,
        blocks: [
            {
                type: "tool-result" as const,
                toolCallId: askCall.id,
                text,
                isError,
            },
        ],
    }
}

describe("formatTurn", () => {
    test("shows the turn's texts and calls in order, each call with its result", () => {
        const blocks = [{ type: "text" as const, text: "Checking.\n" }]

        const text = formatTurn(
            [...blocks, askCall],
            createAnswer("Question asked, as message #2 of ticket #1."),
        )

        expect(text).toBe(
            'Checking.\n→ ticket_ask\n  body: "Which build?"\n← Question asked, as message #2 of ticket #1.',
        )
    })

    test("marks a call that failed, and indents its result's later lines", () => {
        const answer = createAnswer(
            "No ticket #4.\n\nRun aico ticket list.",
            true,
        )

        const text = formatTurn([askCall], answer)

        expect(text).toEndWith("\n✗ No ticket #4.\n\n  Run aico ticket list.")
    })

    test("shows a turn not sent yet, without results", () => {
        const text = formatTurn([askCall])

        expect(text).toBe('→ ticket_ask\n  body: "Which build?"')
    })
})
