import { describe, expect, test } from "bun:test"
import {
    type AssistantTurn,
    ConversationTurnSchema,
    type ToolCallBlock,
} from "./schema.ts"

const sendingCall: ToolCallBlock = {
    type: "tool-call",
    id: "toolu_01",
    name: "message_send",
    input: { body: "@director Hono, for Bun." },
}

const personTurn: AssistantTurn = {
    role: "assistant",
    blocks: [{ type: "text", text: "Answering." }, sendingCall],
}

const modelResponse = {
    protocol: "anthropic-messages",
    payload: { id: "msg_01", content: [] },
    usage: {
        inputTokens: 10,
        outputTokens: 5,
        cacheReadInputTokens: 100,
        cacheCreationInputTokens: 20,
    },
    stop: { reason: "end" },
}

function accepts(turn: unknown): boolean {
    return ConversationTurnSchema.safeParse(turn).success
}

describe("ConversationTurnSchema", () => {
    test("accepts a person's turn, without a model's response", () => {
        expect(ConversationTurnSchema.parse(personTurn)).toEqual(personTurn)
    })

    test("accepts a model's turn, with its provider's response", () => {
        expect(accepts({ ...personTurn, modelResponse })).toBe(true)
    })

    test("accepts the results of a turn's calls, given back by llmco", () => {
        const resultTurn = {
            role: "user",
            blocks: [
                {
                    type: "tool-result",
                    toolCallId: "toolu_01",
                    text: "Sent as entry #2 of thread 2026-10-18-stack.",
                    isError: false,
                },
            ],
        }

        expect(accepts(resultTurn)).toBe(true)
    })

    test("rejects a tool call in a turn llmco gives", () => {
        expect(accepts({ role: "user", blocks: [sendingCall] })).toBe(false)
    })

    test("rejects a reason to stop that llmco doesn't know", () => {
        const pausedResponse = { ...modelResponse, stop: { reason: "pause" } }
        const pausedTurn = { ...personTurn, modelResponse: pausedResponse }

        expect(accepts(pausedTurn)).toBe(false)
    })
})
