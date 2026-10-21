import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { UserError } from "../../user-error.ts"
import type { Protocol } from "../connection/schema.ts"
import { saveLlmProvider } from "../provider/storage.ts"
import type { LlmModel } from "./schema.ts"
import { loadLlmModel, saveLlmModel } from "./storage.ts"
import { updateLlmModel } from "./update-llm-model.ts"

let projectRoot: string

const opus: LlmModel = {
    providerId: "openrouter",
    id: "opus",
    name: "Opus",
    apiId: "anthropic/claude-opus-5-5",
    protocol: "anthropic-messages",
}

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveLlmProvider(projectRoot, {
            id: "openrouter",
            name: "OpenRouter",
            connections: {
                "anthropic-messages": { baseUrl: "https://openrouter.ai/api" },
                "openai-responses": { baseUrl: "https://openrouter.ai/api/v1" },
            },
        }),
        saveLlmModel(projectRoot, opus),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function updateOpus(changes: { name?: string; protocol?: Protocol }) {
    return updateLlmModel(projectRoot, "openrouter", "opus", changes)
}

describe("updateLlmModel", () => {
    test("changes only what it is given, and returns the model", async () => {
        const updatedModel = await updateOpus({ name: "Claude Opus" })

        const model = await loadLlmModel(projectRoot, "openrouter", "opus")
        expect(model).toEqual({ ...opus, name: "Claude Opus" })
        expect(updatedModel).toEqual(model)
    })

    test("moves the model to another of its provider's connections", async () => {
        const updatedModel = await updateOpus({ protocol: "openai-responses" })

        expect(updatedModel.protocol).toBe("openai-responses")
    })

    test("refuses a protocol the provider has no connection through", async () => {
        const updating = updateOpus({ protocol: "openai-chat-completions" })

        await expect(updating).rejects.toThrow(UserError)
        await expect(updating).rejects.toThrow("no openai-chat-completions")
    })

    test("refuses a blank name", async () => {
        const updating = updateOpus({ name: " " })

        await expect(updating).rejects.toThrow(UserError)
    })

    test("refuses a model the provider doesn't have", async () => {
        const updating = updateLlmModel(projectRoot, "openrouter", "haiku", {})

        await expect(updating).rejects.toThrow('has no model "haiku"')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const updating = updateLlmModel(
            folderWithoutCompany,
            "openrouter",
            "opus",
            {},
        )

        await expect(updating).rejects.toThrow("Run `llmco init` first.")
    })
})
