import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { requireLlmConnection } from "./require-llm-connection.ts"

const anthropicMessagesConnection = { baseUrl: "https://api.anthropic.com" }

const anthropic = {
    id: "anthropic",
    name: "Anthropic",
    connections: { "anthropic-messages": anthropicMessagesConnection },
}

describe("requireLlmConnection", () => {
    test("gives the provider's connection through the protocol", () => {
        const connection = requireLlmConnection(anthropic, "anthropic-messages")

        expect(connection).toEqual(anthropicMessagesConnection)
    })

    test("refuses a protocol the provider has no connection through", () => {
        const requireResponsesConnection = () =>
            requireLlmConnection(anthropic, "openai-responses")
        const refusalMessage =
            'Provider "anthropic" has no openai-responses connection. Run `llmco provider connection list` to see its connections, or `llmco provider connection create` to add one.'

        expect(requireResponsesConnection).toThrow(UserError)
        expect(requireResponsesConnection).toThrow(refusalMessage)
    })
})
