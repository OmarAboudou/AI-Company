import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
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
    apiKeySource: { kind: "env", variable: "ANTHROPIC_API_KEY" },
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
        const apiKeySource = {
            kind: "file",
            path: "~/.keys/anthropic",
        } as const

        await updateLlmProvider(projectRoot, "anthropic", { apiKeySource })

        const provider = await loadLlmProvider(projectRoot, "anthropic")
        expect(provider).toEqual({ ...anthropic, apiKeySource })
    })

    test("returns the provider it saved", async () => {
        const updatedProvider = await updateLlmProvider(
            projectRoot,
            "anthropic",
            {},
        )

        const savedProvider = await loadLlmProvider(projectRoot, "anthropic")

        expect(updatedProvider).toEqual(savedProvider)
    })

    test("refuses a blank name", async () => {
        const blankNameChanges = { name: " " }

        const updating = updateLlmProvider(
            projectRoot,
            "anthropic",
            blankNameChanges,
        )

        await expect(updating).rejects.toThrow(UserError)
    })

    test("refuses an unknown provider", async () => {
        const updating = updateLlmProvider(projectRoot, "openai", { name: "O" })

        await expect(updating).rejects.toThrow('No provider "openai".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const updating = updateLlmProvider(folderWithoutCompany, "anthropic", {
            name: "A",
        })

        await expect(updating).rejects.toThrow("Run `llmco init` first.")
    })
})
