import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { UserError } from "../../user-error.ts"
import { createLlmProvider } from "./create-llm-provider.ts"
import { loadLlmProvider } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const anthropic = {
    name: "Anthropic",
    apiKeySource: { kind: "env", variable: "ANTHROPIC_API_KEY" },
} as const

describe("createLlmProvider", () => {
    test("saves the provider with its name and API key's source", async () => {
        const createdProvider = await createLlmProvider(
            projectRoot,
            "acme",
            anthropic,
        )

        const provider = await loadLlmProvider(projectRoot, "acme")
        expect(provider).toEqual({ id: "acme", ...anthropic })
        expect(createdProvider).toEqual(provider)
    })

    test("saves a provider without API key", async () => {
        const ollama = { name: "Ollama" }

        await createLlmProvider(projectRoot, "ollama", ollama)

        const provider = await loadLlmProvider(projectRoot, "ollama")
        expect(provider).toEqual({ id: "ollama", ...ollama })
    })

    test("refuses an id another provider has", async () => {
        await createLlmProvider(projectRoot, "anthropic", anthropic)

        const creation = createLlmProvider(projectRoot, "anthropic", anthropic)

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow('"anthropic" already exists.')
    })

    test("refuses an id that is not kebab-case", async () => {
        const creation = createLlmProvider(projectRoot, "Acme", anthropic)

        await expect(creation).rejects.toThrow('Invalid provider id "Acme"')
    })

    test("refuses an invalid API key's source", async () => {
        const apiKeySource = {
            kind: "env",
            variable: "$ANTHROPIC_API_KEY",
        } as const
        const anthropicWithDollar = { ...anthropic, apiKeySource }

        const creation = createLlmProvider(
            projectRoot,
            "anthropic",
            anthropicWithDollar,
        )

        await expect(creation).rejects.toThrow(UserError)
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const creation = createLlmProvider(
            folderWithoutCompany,
            "anthropic",
            anthropic,
        )

        await expect(creation).rejects.toThrow("Run `llmco init` first.")
    })
})
