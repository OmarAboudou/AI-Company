import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import { UserError } from "../../user-error.ts"
import type { Protocol } from "../connection/schema.ts"
import { saveLlmProvider } from "../provider/storage.ts"
import { createLlmModel } from "./create-llm-model.ts"
import { loadLlmModel } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveLlmProvider(projectRoot, {
            id: "anthropic",
            name: "Anthropic",
            connections: {
                "anthropic-messages": { baseUrl: "https://api.anthropic.com" },
            },
        }),
        saveLlmProvider(projectRoot, {
            id: "openrouter",
            name: "OpenRouter",
            connections: {
                "anthropic-messages": { baseUrl: "https://openrouter.ai/api" },
                "openai-responses": { baseUrl: "https://openrouter.ai/api/v1" },
            },
        }),
        saveLlmProvider(projectRoot, { id: "ollama", name: "Ollama" }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function createOpus(providerId: string, protocol?: Protocol) {
    const opus = { name: "Opus", apiId: "claude-opus-5-5", protocol }
    return createLlmModel(projectRoot, providerId, "opus", opus)
}

describe("createLlmModel", () => {
    test("calls the model through the provider's only connection", async () => {
        const created = await createOpus("anthropic")

        const model = await loadLlmModel(projectRoot, "anthropic", "opus")
        expect(model).toEqual({
            providerId: "anthropic",
            id: "opus",
            name: "Opus",
            apiId: "claude-opus-5-5",
            protocol: "anthropic-messages",
        })
        expect(created).toEqual(model)
    })

    test("calls the model through the protocol it is given", async () => {
        const model = await createOpus("openrouter", "openai-responses")

        expect(model.protocol).toBe("openai-responses")
    })

    test("refuses to choose among several connections", async () => {
        const creation = createOpus("openrouter")

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow("choose one with --protocol.")
    })

    test("refuses a provider without connection", async () => {
        const creation = createOpus("ollama")

        await expect(creation).rejects.toThrow('"ollama" has no connection yet')
    })

    test("refuses a protocol the provider has no connection through", async () => {
        const creation = createOpus("anthropic", "openai-responses")

        await expect(creation).rejects.toThrow("no openai-responses connection")
    })

    test("refuses a model id the provider already has", async () => {
        await createOpus("anthropic")

        const creation = createOpus("anthropic")

        await expect(creation).rejects.toThrow('already has a model "opus".')
    })

    test("refuses a model id that is not kebab-case", async () => {
        const opus = { name: "Opus", apiId: "claude-opus-5-5" }

        const creation = createLlmModel(projectRoot, "anthropic", "Opus", opus)

        await expect(creation).rejects.toThrow('Invalid model id "Opus"')
    })

    test("refuses an unknown provider", async () => {
        const creation = createOpus("openai")

        await expect(creation).rejects.toThrow('No provider "openai".')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")
        const opus = { name: "Opus", apiId: "claude-opus-5-5" }

        const creation = createLlmModel(elsewhere, "anthropic", "opus", opus)

        await expect(creation).rejects.toThrow("Run `llmco init` first.")
    })
})
