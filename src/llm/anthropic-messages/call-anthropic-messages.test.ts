import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { callAnthropicMessages } from "./call-anthropic-messages.ts"
import { useFakeAnthropicServer } from "./use-fake-anthropic-server.ts"

describe("callAnthropicMessages", () => {
    const fakeServer = useFakeAnthropicServer()

    function callFakeServer(
        apiKey: string | undefined,
        auth?: "x-api-key" | "bearer",
    ) {
        const streamedTexts: string[] = []
        const response = callAnthropicMessages({
            connection: { baseUrl: fakeServer.getUrl(), ...(auth && { auth }) },
            apiKey,
            apiId: "claude-opus-5-5",
            systemPrompt: "You are Claude Senior.",
            turns: [{ role: "user", content: "Hono or Express?" }],
            onText: (text) => streamedTexts.push(text),
        })
        return { streamedTexts, response }
    }

    test("streams the text, then returns the message to store", async () => {
        fakeServer.respondWith({ text: "Hono, for Bun." })

        const { streamedTexts, response } = callFakeServer("sk-test")
        const storedResponse = JSON.parse(JSON.stringify(await response))

        expect(streamedTexts).toEqual(["Hono, ", "for ", "Bun."])
        expect(storedResponse.content).toEqual([
            { type: "text", text: "Hono, for Bun." },
        ])
    })

    test("sends the key as x-api-key, or as a bearer token", async () => {
        await callFakeServer("sk-test").response
        await callFakeServer("sk-test", "bearer").response
        const [apiKeyHeaders, bearerHeaders] = fakeServer.requests.map(
            ({ headers }) => headers,
        )

        expect(apiKeyHeaders?.["x-api-key"]).toBe("sk-test")
        expect(bearerHeaders?.authorization).toBe("Bearer sk-test")
    })

    test("sends no key at all without one", async () => {
        await callFakeServer(undefined).response
        const headers = fakeServer.requests[0]?.headers

        expect(headers?.["x-api-key"]).toBeUndefined()
        expect(headers?.authorization).toBeUndefined()
    })

    test("turns an API error into a user error", async () => {
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })

        const { response } = callFakeServer("sk-wrong")

        await expect(response).rejects.toThrow(UserError)
        await expect(response).rejects.toThrow("invalid x-api-key")
    })
})
