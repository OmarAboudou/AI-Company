import { describe, expect, test } from "bun:test"
import { formatTurn } from "./format-turn.ts"

const messageSendCall = {
    type: "tool-call" as const,
    id: "call_8f3a2b1c9d0e",
    name: "message_send",
    input: { body: "Friday." },
}

function createAnswer(text: string, isError = false) {
    return {
        role: "user" as const,
        blocks: [
            {
                type: "tool-result" as const,
                toolCallId: messageSendCall.id,
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
            [...blocks, messageSendCall],
            createAnswer("Sent as entry #2."),
        )

        expect(text).toBe(
            'Checking.\n→ message_send\n  body: "Friday."\n← Sent as entry #2.',
        )
    })

    test("marks a call that failed, and indents its result's later lines", () => {
        const answer = createAnswer(
            "No ticket #4.\n\nRun aico ticket list.",
            true,
        )

        const text = formatTurn([messageSendCall], answer)

        expect(text).toEndWith("\n✗ No ticket #4.\n\n  Run aico ticket list.")
    })

    test("shows a turn not sent yet, without results", () => {
        const text = formatTurn([messageSendCall])

        expect(text).toBe('→ message_send\n  body: "Friday."')
    })
})
