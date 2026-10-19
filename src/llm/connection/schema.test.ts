import { describe, expect, test } from "bun:test"
import { ConnectionsSchema, protocols } from "./schema.ts"

const localConnection = { baseUrl: "http://localhost:11434" }

function accepts(connections: unknown): boolean {
    return ConnectionsSchema.safeParse(connections).success
}

describe("ConnectionsSchema", () => {
    test.each(protocols)("accepts a %s connection with a base URL", (name) => {
        const connections = { [name]: localConnection }

        expect(ConnectionsSchema.parse(connections)).toEqual(connections)
    })

    test("accepts no connection at all", () => {
        expect(accepts({})).toBe(true)
    })

    test("rejects an unknown protocol", () => {
        const geminiConnections = { "gemini-generate-content": localConnection }

        expect(accepts(geminiConnections)).toBe(false)
    })

    test("rejects a missing base URL", () => {
        expect(accepts({ "anthropic-messages": {} })).toBe(false)
    })

    test.each(["localhost:11434", "ftp://example.com", "not a url"])(
        "rejects the base URL %s",
        (baseUrl) => {
            expect(accepts({ "anthropic-messages": { baseUrl } })).toBe(false)
        },
    )

    test("accepts x-api-key or bearer auth on anthropic-messages", () => {
        const bearerConnection = { ...localConnection, auth: "bearer" }
        const apiKeyConnection = { ...localConnection, auth: "x-api-key" }

        expect(accepts({ "anthropic-messages": bearerConnection })).toBe(true)
        expect(accepts({ "anthropic-messages": apiKeyConnection })).toBe(true)
    })

    test("rejects an unknown auth", () => {
        const basicConnection = { ...localConnection, auth: "basic" }

        expect(accepts({ "anthropic-messages": basicConnection })).toBe(false)
    })

    test("rejects auth on the OpenAI protocols, always bearer", () => {
        const bearerConnection = { ...localConnection, auth: "bearer" }

        const chatConnections = { "openai-chat-completions": bearerConnection }
        const responsesConnections = { "openai-responses": bearerConnection }

        expect(accepts(chatConnections)).toBe(false)
        expect(accepts(responsesConnections)).toBe(false)
    })
})
