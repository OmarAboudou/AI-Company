import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { UserError } from "../../user-error.ts"
import type { LlmProvider } from "../provider/schema.ts"
import { loadLlmProvider, saveLlmProvider } from "../provider/storage.ts"
import type { Protocol } from "./schema.ts"
import { updateLlmConnection } from "./update-llm-connection.ts"

let projectRoot: string

const openRouter: LlmProvider = {
    id: "openrouter",
    name: "OpenRouter",
    connections: {
        "anthropic-messages": { baseUrl: "https://openrouter.ai/api" },
        "openai-responses": { baseUrl: "https://openrouter.ai/api/v1" },
    },
}

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await saveLlmProvider(projectRoot, openRouter)
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function updateConnection(protocol: Protocol, changes: { auth?: string }) {
    return updateLlmConnection(projectRoot, "openrouter", protocol, changes)
}

describe("updateLlmConnection", () => {
    test("changes only what it is given, keeping the other connections", async () => {
        const savedProvider = await updateConnection("anthropic-messages", {
            auth: "bearer",
        })

        const provider = await loadLlmProvider(projectRoot, "openrouter")
        expect(provider.connections).toEqual({
            ...openRouter.connections,
            "anthropic-messages": {
                baseUrl: "https://openrouter.ai/api",
                auth: "bearer",
            },
        })
        expect(savedProvider).toEqual(provider)
    })

    test("refuses --auth for an OpenAI protocol", async () => {
        const updating = updateConnection("openai-responses", {
            auth: "bearer",
        })

        await expect(updating).rejects.toThrow(UserError)
        await expect(updating).rejects.toThrow("only applies to anthropic")
    })

    test("refuses a protocol the provider has no connection through", async () => {
        const updating = updateConnection("openai-chat-completions", {})

        await expect(updating).rejects.toThrow("no openai-chat-completions")
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")
        const protocol = "openai-responses"

        const updating = updateLlmConnection(
            folderWithoutCompany,
            "x",
            protocol,
            {},
        )

        await expect(updating).rejects.toThrow("Run `llmco init` first.")
    })
})
