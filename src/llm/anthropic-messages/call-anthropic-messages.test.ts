import { describe, expect, test } from "bun:test"
import type Anthropic from "@anthropic-ai/sdk"
import { UserError } from "../../user-error.ts"
import { callAnthropicMessages } from "./call-anthropic-messages.ts"
import { useFakeAnthropicServer } from "./use-fake-anthropic-server.ts"

const sendingTool: Anthropic.Tool = {
    name: "message_send",
    description: "Send a message in a thread.",
    input_schema: {
        type: "object",
        properties: { body: { type: "string" } },
        required: ["body"],
    },
}

describe("callAnthropicMessages", () => {
    const fakeServer = useFakeAnthropicServer()

    function callFakeServer(
        apiKey: string | undefined,
        {
            auth,
            tools = [],
        }: { auth?: "x-api-key" | "bearer"; tools?: Anthropic.Tool[] } = {},
    ) {
        const streamedTexts: string[] = []
        const response = callAnthropicMessages({
            connection: { baseUrl: fakeServer.getUrl(), ...(auth && { auth }) },
            apiKey,
            apiId: "claude-opus-5-5",
            systemPrompt: "You are Claude Senior.",
            tools,
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

    test("sends the tools, and returns the turn's tool calls in order", async () => {
        const toolCalls = [
            { name: "thread_show", input: { threadId: "2026-10-18-budget" } },
            { name: "message_send", input: { body: "Hono." } },
        ]
        fakeServer.respondWith({ toolCalls })

        const tools = [sendingTool]
        const message = await callFakeServer("sk-test", { tools }).response

        const madeToolCalls = message.content.flatMap((block) =>
            block.type === "tool_use"
                ? [{ name: block.name, input: block.input }]
                : [],
        )
        expect(fakeServer.requests[0]?.body.tools).toEqual(tools)
        expect(madeToolCalls).toEqual(toolCalls)
        expect(message.stop_reason).toBe("tool_use")
    })

    test("sends no tools to a model given none", async () => {
        await callFakeServer("sk-test").response

        expect(fakeServer.requests[0]?.body).not.toHaveProperty("tools")
    })

    test("sends the key as x-api-key, or as a bearer token", async () => {
        await callFakeServer("sk-test").response
        await callFakeServer("sk-test", { auth: "bearer" }).response
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
