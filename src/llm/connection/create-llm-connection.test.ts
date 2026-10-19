import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import { UserError } from "../../user-error.ts"
import { loadLlmProvider, saveLlmProvider } from "../provider/storage.ts"
import { createLlmConnection } from "./create-llm-connection.ts"
import type { Protocol } from "./schema.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await saveLlmProvider(projectRoot, { id: "openrouter", name: "OpenRouter" })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const baseUrl = "https://openrouter.ai/api"

function connect(protocol: Protocol, auth?: string) {
    return createLlmConnection(projectRoot, "openrouter", protocol, {
        baseUrl,
        auth,
    })
}

describe("createLlmConnection", () => {
    test("adds a connection through a protocol to the provider", async () => {
        const savedProvider = await connect("anthropic-messages", "bearer")

        const provider = await loadLlmProvider(projectRoot, "openrouter")
        expect(provider.connections).toEqual({
            "anthropic-messages": { baseUrl, auth: "bearer" },
        })
        expect(savedProvider).toEqual(provider)
    })

    test("keeps the provider's other connections", async () => {
        await connect("openai-chat-completions")

        await connect("openai-responses")

        const provider = await loadLlmProvider(projectRoot, "openrouter")
        expect(Object.keys(provider.connections ?? {})).toEqual([
            "openai-chat-completions",
            "openai-responses",
        ])
    })

    test("refuses a second connection through the same protocol", async () => {
        await connect("openai-responses")

        const creation = connect("openai-responses")

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow("already has a connection")
    })

    test("refuses --auth for an OpenAI protocol", async () => {
        const creation = connect("openai-responses", "bearer")

        await expect(creation).rejects.toThrow("only applies to anthropic")
    })

    test("refuses an invalid base URL", async () => {
        const creation = createLlmConnection(
            projectRoot,
            "openrouter",
            "openai-responses",
            { baseUrl: "localhost:11434" },
        )

        await expect(creation).rejects.toThrow(UserError)
    })

    test("refuses an unknown provider", async () => {
        const creation = createLlmConnection(
            projectRoot,
            "ollama",
            "openai-responses",
            { baseUrl },
        )

        await expect(creation).rejects.toThrow('No provider "ollama".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const creation = createLlmConnection(
            folderWithoutCompany,
            "openrouter",
            "openai-responses",
            { baseUrl },
        )

        await expect(creation).rejects.toThrow("Run `llmco init` first.")
    })
})
