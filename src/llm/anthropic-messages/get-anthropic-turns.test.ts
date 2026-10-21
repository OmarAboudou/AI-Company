import { describe, expect, test } from "bun:test"
import type Anthropic from "@anthropic-ai/sdk"
import type {
    AssistantTurn,
    ModelResponse,
    ToolCallBlock,
} from "../conversation/schema.ts"
import { getAnthropicTurns } from "./get-anthropic-turns.ts"

const sendingCall: ToolCallBlock = {
    type: "tool-call",
    id: "toolu_01",
    name: "message_send",
    input: { body: "@director Hono." },
}

const answeringTurn: AssistantTurn = {
    role: "assistant",
    blocks: [{ type: "text", text: "Answering." }, sendingCall],
}

const usage = {
    inputTokens: 10,
    outputTokens: 5,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
}

function createModelResponse(
    protocol: ModelResponse["protocol"],
    payload: unknown,
): ModelResponse {
    return { protocol, payload, usage, stop: { reason: "end" } }
}

describe("getAnthropicTurns", () => {
    test("replays a model's turn from its response, signed reasoning included", () => {
        const content: Anthropic.ContentBlock[] = [
            { type: "thinking", thinking: "", signature: "c2lnbmVk" },
            { type: "text", text: "Answering.", citations: null },
            {
                type: "tool_use",
                id: "toolu_01",
                caller: { type: "direct" },
                name: "message_send",
                input: { body: "@director Hono." },
            },
        ]
        const modelResponse = createModelResponse("anthropic-messages", {
            content,
        })

        const [turn] = getAnthropicTurns([{ ...answeringTurn, modelResponse }])

        expect(turn).toEqual({ role: "assistant", content })
    })

    test("writes a person's turn from its blocks", () => {
        const [turn] = getAnthropicTurns([answeringTurn])

        expect(turn).toEqual({
            role: "assistant",
            content: [
                { type: "text", text: "Answering." },
                {
                    type: "tool_use",
                    id: "toolu_01",
                    name: "message_send",
                    input: { body: "@director Hono." },
                },
            ],
        })
    })

    test("writes another protocol's turn from its blocks", () => {
        const modelResponse = createModelResponse("openai-responses", {})

        const [turn] = getAnthropicTurns([{ ...answeringTurn, modelResponse }])

        expect(turn?.content).toHaveLength(2)
    })

    test("gives the results back under their calls' ids, errors marked", () => {
        const [turn] = getAnthropicTurns([
            {
                role: "user",
                blocks: [
                    {
                        type: "tool-result",
                        toolCallId: "toolu_01",
                        text: "Sent as entry #2.",
                        isError: false,
                    },
                    {
                        type: "tool-result",
                        toolCallId: "toolu_02",
                        text: "There is no tool named thread_read.",
                        isError: true,
                    },
                ],
            },
        ])

        expect(turn).toEqual({
            role: "user",
            content: [
                {
                    type: "tool_result",
                    tool_use_id: "toolu_01",
                    content: "Sent as entry #2.",
                },
                {
                    type: "tool_result",
                    tool_use_id: "toolu_02",
                    content: "There is no tool named thread_read.",
                    is_error: true,
                },
            ],
        })
    })
})
