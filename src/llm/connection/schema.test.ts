import { describe, expect, test } from "bun:test"
import { ConnectionsSchema, protocols } from "./schema.ts"

const local = { baseUrl: "http://localhost:11434" }

function accepts(connections: unknown): boolean {
    return ConnectionsSchema.safeParse(connections).success
}

describe("ConnectionsSchema", () => {
    test.each(protocols)("accepts a %s connection with a base URL", (name) => {
        const connections = { [name]: local }

        expect(ConnectionsSchema.parse(connections)).toEqual(connections)
    })

    test("accepts no connection at all", () => {
        expect(accepts({})).toBe(true)
    })

    test("rejects an unknown protocol", () => {
        expect(accepts({ "gemini-generate-content": local })).toBe(false)
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
        const bearer = { ...local, auth: "bearer" }
        const apiKey = { ...local, auth: "x-api-key" }

        expect(accepts({ "anthropic-messages": bearer })).toBe(true)
        expect(accepts({ "anthropic-messages": apiKey })).toBe(true)
    })

    test("rejects an unknown auth", () => {
        const basic = { ...local, auth: "basic" }

        expect(accepts({ "anthropic-messages": basic })).toBe(false)
    })

    test("rejects auth on the OpenAI protocols, always bearer", () => {
        const bearer = { ...local, auth: "bearer" }

        expect(accepts({ "openai-chat-completions": bearer })).toBe(false)
        expect(accepts({ "openai-responses": bearer })).toBe(false)
    })
})
