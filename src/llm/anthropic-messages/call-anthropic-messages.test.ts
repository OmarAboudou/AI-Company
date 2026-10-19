import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { callAnthropicMessages } from "./call-anthropic-messages.ts"
import { useFakeAnthropic } from "./use-fake-anthropic-server.ts"

describe("callAnthropicMessages", () => {
    const fake = useFakeAnthropic()

    function call(apiKey: string | undefined, auth?: "x-api-key" | "bearer") {
        const pieces: string[] = []
        const response = callAnthropicMessages({
            connection: { baseUrl: fake.url(), ...(auth && { auth }) },
            apiKey,
            apiId: "claude-opus-5-5",
            system: "You are Claude Senior.",
            messages: [{ role: "user", content: "Hono or Express?" }],
            onText: (text) => pieces.push(text),
        })
        return { pieces, response }
    }

    test("streams the text, then returns the message to store", async () => {
        fake.respondWith({ text: "Hono, for Bun." })

        const { pieces, response } = call("sk-test")
        const stored = JSON.parse(JSON.stringify(await response))

        expect(pieces).toEqual(["Hono, ", "for ", "Bun."])
        expect(stored.content).toEqual([
            { type: "text", text: "Hono, for Bun." },
        ])
    })

    test("sends the key as x-api-key, or as a bearer token", async () => {
        await call("sk-test").response
        await call("sk-test", "bearer").response
        const [apiKey, bearer] = fake.requests.map(({ headers }) => headers)

        expect(apiKey?.["x-api-key"]).toBe("sk-test")
        expect(bearer?.authorization).toBe("Bearer sk-test")
    })

    test("sends no key at all without one", async () => {
        await call(undefined).response
        const headers = fake.requests[0]?.headers

        expect(headers?.["x-api-key"]).toBeUndefined()
        expect(headers?.authorization).toBeUndefined()
    })

    test("turns an API error into a user error", async () => {
        fake.respondWith({ status: 401, error: "invalid x-api-key" })

        const { response } = call("sk-wrong")

        await expect(response).rejects.toThrow(UserError)
        await expect(response).rejects.toThrow("invalid x-api-key")
    })
})
