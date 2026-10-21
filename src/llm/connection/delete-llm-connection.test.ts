import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { UserError } from "../../user-error.ts"
import { saveLlmModel } from "../model/storage.ts"
import type { LlmProvider } from "../provider/schema.ts"
import { loadLlmProvider, saveLlmProvider } from "../provider/storage.ts"
import { deleteLlmConnection } from "./delete-llm-connection.ts"
import type { Protocol } from "./schema.ts"

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

function disconnect(protocol: Protocol) {
    return deleteLlmConnection(projectRoot, "openrouter", protocol)
}

describe("deleteLlmConnection", () => {
    test("removes the connection and keeps the others", async () => {
        const savedProvider = await disconnect("anthropic-messages")

        const provider = await loadLlmProvider(projectRoot, "openrouter")
        expect(Object.keys(provider.connections ?? {})).toEqual([
            "openai-responses",
        ])
        expect(savedProvider).toEqual(provider)
    })

    test("refuses a connection a model is called through", async () => {
        await saveLlmModel(projectRoot, {
            providerId: "openrouter",
            id: "opus",
            name: "Opus",
            apiId: "anthropic/claude-opus-5-5",
            protocol: "anthropic-messages",
        })

        const deletion = disconnect("anthropic-messages")

        await expect(deletion).rejects.toThrow(UserError)
        await expect(deletion).rejects.toThrow("is used by models opus.")
    })

    test("refuses a protocol the provider has no connection through", async () => {
        const deletion = disconnect("openai-chat-completions")

        await expect(deletion).rejects.toThrow("no openai-chat-completions")
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const deletion = deleteLlmConnection(
            folderWithoutCompany,
            "x",
            "openai-responses",
        )

        await expect(deletion).rejects.toThrow("Run `llmco init` first.")
    })
})
