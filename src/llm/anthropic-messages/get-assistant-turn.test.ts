import { describe, expect, test } from "bun:test"
import type Anthropic from "@anthropic-ai/sdk"
import { getAssistantTurn } from "./get-assistant-turn.ts"

function createMessage(
    message: Partial<Anthropic.Message> = {},
): Anthropic.Message {
    return {
        id: "msg_01",
        type: "message",
        role: "assistant",
        model: "claude-opus-5-5",
        container: null,
        diagnostics: null,
        content: [],
        stop_reason: "end_turn",
        stop_details: null,
        stop_sequence: null,
        usage: {
            input_tokens: 10,
            output_tokens: 5,
            cache_creation_input_tokens: 20,
            cache_read_input_tokens: 100,
            cache_creation: null,
            inference_geo: null,
            output_tokens_details: null,
            server_tool_use: null,
            service_tier: "standard",
            speed: null,
        },
        ...message,
    }
}

describe("getAssistantTurn", () => {
    test("takes the texts and tool calls in order, the reasoning staying in the response", () => {
        const message = createMessage({
            content: [
                { type: "thinking", thinking: "", signature: "c2lnbmVk" },
                { type: "text", text: "Answering.", citations: null },
                {
                    type: "tool_use",
                    id: "toolu_01",
                    caller: { type: "direct" },
                    name: "message_send",
                    input: { body: "Hono." },
                },
            ],
            stop_reason: "tool_use",
        })

        const turn = getAssistantTurn(message)

        expect(turn.blocks).toEqual([
            { type: "text", text: "Answering." },
            {
                type: "tool-call",
                id: "toolu_01",
                name: "message_send",
                input: { body: "Hono." },
            },
        ])
        expect(turn.modelResponse.protocol).toBe("anthropic-messages")
        expect(turn.modelResponse.payload).toBe(message)
    })

    test("counts the tokens, the prompt cache's reads and writes apart", () => {
        const { usage } = getAssistantTurn(createMessage()).modelResponse

        expect(usage).toEqual({
            inputTokens: 10,
            outputTokens: 5,
            cacheReadInputTokens: 100,
            cacheCreationInputTokens: 20,
        })
    })

    test.each([
        ["end_turn", { reason: "end" }],
        ["tool_use", { reason: "end" }],
        ["max_tokens", { reason: "max-length" }],
        [
            "model_context_window_exceeded",
            { reason: "context-window-exceeded" },
        ],
        ["refusal", { reason: "refusal" }],
    ] as const)("tells why the model stopped: %s", (stopReason, stop) => {
        const message = createMessage({ stop_reason: stopReason })

        expect(getAssistantTurn(message).modelResponse.stop).toEqual(stop)
    })

    test("keeps the category of a refusal", () => {
        const message = createMessage({
            stop_reason: "refusal",
            stop_details: {
                type: "refusal",
                category: "cyber",
                explanation: null,
            },
        })

        const { stop } = getAssistantTurn(message).modelResponse

        expect(stop).toEqual({ reason: "refusal", category: "cyber" })
    })
})
