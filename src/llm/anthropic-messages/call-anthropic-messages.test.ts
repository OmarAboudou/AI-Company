import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import type {
    ConversationTurn,
    ToolDefinition,
} from "../conversation/schema.ts"
import { callAnthropicMessages } from "./call-anthropic-messages.ts"
import { getAnthropicTools } from "./get-anthropic-tools.ts"
import { useFakeAnthropicServer } from "./use-fake-anthropic-server.testing.ts"

const sendingTool: ToolDefinition = {
    name: "ticket_ask",
    description: "Ask the requester of a ticket a question.",
    inputSchema: {
        type: "object",
        properties: { body: { type: "string" } },
        required: ["body"],
    },
}

function createUserTurn(text: string): ConversationTurn {
    return { role: "user", blocks: [{ type: "text", text }] }
}

describe("callAnthropicMessages", () => {
    const fakeServer = useFakeAnthropicServer()

    function callFakeServer(
        apiKey: string | undefined,
        {
            auth,
            tools = [],
            turns = [createUserTurn("Hono or Express?")],
        }: {
            auth?: "x-api-key" | "bearer"
            tools?: ToolDefinition[]
            turns?: ConversationTurn[]
        } = {},
    ) {
        const streamedTexts: string[] = []
        const response = callAnthropicMessages({
            connection: { baseUrl: fakeServer.getUrl(), ...(auth && { auth }) },
            apiKey,
            apiId: "claude-opus-5-5",
            conversation: {
                systemPrompt: "You are Claude Senior.",
                tools,
                turns,
            },
            onText: (text) => streamedTexts.push(text),
        })
        return { streamedTexts, response }
    }

    test("streams the text, then returns the model's turn to store", async () => {
        fakeServer.respondWith({ text: "Hono, for Bun." })

        const { streamedTexts, response } = callFakeServer("sk-test")
        const turn = await response
        const storedPayload = JSON.parse(
            JSON.stringify(turn.modelResponse.payload),
        )

        expect(streamedTexts).toEqual(["Hono, ", "for ", "Bun."])
        expect(turn.blocks).toEqual([{ type: "text", text: "Hono, for Bun." }])
        expect(storedPayload.content).toEqual([
            { type: "text", text: "Hono, for Bun." },
        ])
    })

    test("sends the tools, and returns the turn's tool calls in order", async () => {
        const toolCalls = [
            { name: "ticket_show", input: { ticketNumber: 2 } },
            { name: "ticket_ask", input: { body: "Hono." } },
        ]
        fakeServer.respondWith({ toolCalls })

        const tools = [sendingTool]
        const turn = await callFakeServer("sk-test", { tools }).response

        const madeToolCalls = turn.blocks.flatMap((block) =>
            block.type === "tool-call"
                ? [{ name: block.name, input: block.input }]
                : [],
        )
        const anthropicTools = getAnthropicTools(tools)
        expect(fakeServer.requests[0]?.body.tools).toEqual(anthropicTools)
        expect(madeToolCalls).toEqual(toolCalls)
    })

    test("marks the system prompt and the turns' end for the prompt cache", async () => {
        const turns: ConversationTurn[] = [
            createUserTurn("Hono?"),
            { role: "assistant", blocks: [{ type: "text", text: "Yes." }] },
            createUserTurn("Why?"),
        ]

        await callFakeServer("sk-test", { turns }).response

        const body = fakeServer.requests[0]?.body
        const cachedBlocks = body?.messages
            .flatMap(({ content }) => content)
            .filter(({ cache_control }) => cache_control !== undefined)
        const cacheControl = { type: "ephemeral" }
        expect(body?.system).toEqual([
            {
                type: "text",
                text: "You are Claude Senior.",
                cache_control: cacheControl,
            },
        ])
        expect(cachedBlocks).toEqual([
            { type: "text", text: "Why?", cache_control: cacheControl },
        ])
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
