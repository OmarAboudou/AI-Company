import { describe, expect, test } from "bun:test"
import { getConnectedProtocols } from "./get-connected-protocols.ts"

describe("getConnectedProtocols", () => {
    test("lists the protocols the provider has a connection through, in llmco's order", () => {
        const openRouter = {
            id: "openrouter",
            name: "OpenRouter",
            connections: {
                "openai-responses": { baseUrl: "https://openrouter.ai/api/v1" },
                "anthropic-messages": { baseUrl: "https://openrouter.ai/api" },
            },
        }

        const connectedProtocols = getConnectedProtocols(openRouter)

        expect(connectedProtocols).toEqual([
            "anthropic-messages",
            "openai-responses",
        ])
    })

    test("lists none for a provider without connections", () => {
        const ollama = { id: "ollama", name: "Ollama" }

        expect(getConnectedProtocols(ollama)).toEqual([])
    })
})
