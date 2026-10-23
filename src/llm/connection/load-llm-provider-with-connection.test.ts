import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { saveLlmProvider } from "../provider/storage.ts"
import { loadLlmProviderWithConnection } from "./load-llm-provider-with-connection.ts"
import type { Protocol } from "./schema.ts"

let projectRoot: string

const anthropic = {
    id: "anthropic",
    name: "Anthropic",
    connections: {
        "anthropic-messages": { baseUrl: "https://api.anthropic.com" },
    },
}

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
    await saveLlmProvider(projectRoot, anthropic)
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function loadThrough(protocol: Protocol) {
    return loadLlmProviderWithConnection(projectRoot, "anthropic", protocol)
}

describe("loadLlmProviderWithConnection", () => {
    test("loads a provider with a connection through the protocol", async () => {
        const provider = await loadThrough("anthropic-messages")

        expect(provider).toEqual(anthropic)
    })

    test("refuses a provider without connection through the protocol", async () => {
        const loading = loadThrough("openai-responses")

        await expect(loading).rejects.toThrow("no openai-responses connection")
    })
})
