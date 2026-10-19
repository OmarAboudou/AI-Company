import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { requireProviderConnection } from "./require-provider-connection.ts"

const anthropic = {
    id: "anthropic",
    name: "Anthropic",
    connections: {
        "anthropic-messages": { baseUrl: "https://api.anthropic.com" },
    },
}

describe("requireProviderConnection", () => {
    test("accepts a protocol the provider has a connection through", () => {
        const requireMessagesConnection = () =>
            requireProviderConnection(anthropic, "anthropic-messages")

        expect(requireMessagesConnection).not.toThrow()
    })

    test("refuses a protocol the provider has no connection through", () => {
        const requireResponsesConnection = () =>
            requireProviderConnection(anthropic, "openai-responses")
        const refusalMessage = "Run `llmco provider connection create` first."

        expect(requireResponsesConnection).toThrow(UserError)
        expect(requireResponsesConnection).toThrow(refusalMessage)
    })
})
