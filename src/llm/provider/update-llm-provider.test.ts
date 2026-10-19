import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import { UserError } from "../../user-error.ts"
import type { LlmProvider } from "./schema.ts"
import { loadLlmProvider, saveLlmProvider } from "./storage.ts"
import { updateLlmProvider } from "./update-llm-provider.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await saveLlmProvider(projectRoot, anthropic)
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const anthropic: LlmProvider = {
    id: "anthropic",
    name: "Anthropic",
    apiKey: { kind: "env", variable: "ANTHROPIC_API_KEY" },
    connections: {
        "anthropic-messages": { baseUrl: "https://api.anthropic.com" },
    },
}

describe("updateLlmProvider", () => {
    test("changes the name and keeps the key's source and connections", async () => {
        await updateLlmProvider(projectRoot, "anthropic", { name: "Claude" })

        const provider = await loadLlmProvider(projectRoot, "anthropic")
        expect(provider).toEqual({ ...anthropic, name: "Claude" })
    })

    test("changes the key's source", async () => {
        const apiKey = { kind: "file", path: "~/.keys/anthropic" } as const

        await updateLlmProvider(projectRoot, "anthropic", { apiKey })

        const provider = await loadLlmProvider(projectRoot, "anthropic")
        expect(provider).toEqual({ ...anthropic, apiKey })
    })

    test("returns the provider it saved", async () => {
        const updated = await updateLlmProvider(projectRoot, "anthropic", {})

        expect(updated).toEqual(await loadLlmProvider(projectRoot, "anthropic"))
    })

    test("refuses a blank name", async () => {
        const blank = { name: " " }

        const update = updateLlmProvider(projectRoot, "anthropic", blank)

        await expect(update).rejects.toThrow(UserError)
    })

    test("refuses an unknown provider", async () => {
        const update = updateLlmProvider(projectRoot, "openai", { name: "O" })

        await expect(update).rejects.toThrow('No provider "openai".')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const update = updateLlmProvider(elsewhere, "anthropic", { name: "A" })

        await expect(update).rejects.toThrow("Run `llmco init` first.")
    })
})
