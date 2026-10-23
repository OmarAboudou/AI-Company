import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import {
    loadEmployee,
    saveEmployee,
} from "../../organization/employee/storage.ts"
import { UserError } from "../../user-error.ts"
import { listLlmModels, saveLlmModel } from "../model/storage.ts"
import { hasLlmProvider, loadLlmProvider, saveLlmProvider } from "./storage.ts"
import { updateLlmProviderId } from "./update-llm-provider-id.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveLlmProvider(projectRoot, { id: "anthropic", name: "Anthropic" }),
        saveLlmProvider(projectRoot, { id: "ollama", name: "Ollama" }),
        saveLlmModel(projectRoot, {
            providerId: "anthropic",
            id: "opus",
            name: "Opus",
            apiId: "claude-opus-5-5",
            protocol: "anthropic-messages",
        }),
        saveEmployee(projectRoot, claude),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const claude = {
    id: "claude",
    name: "Claude",
    kind: "llm",
    providerId: "anthropic",
    modelId: "opus",
} as const

describe("updateLlmProviderId", () => {
    test("moves the provider and its models to its new id", async () => {
        await updateLlmProviderId(projectRoot, "anthropic", "claude-api")

        const [provider, models] = await Promise.all([
            loadLlmProvider(projectRoot, "claude-api"),
            listLlmModels(projectRoot, "claude-api"),
        ])
        expect(provider.name).toBe("Anthropic")
        expect(models.map(({ id }) => id)).toEqual(["opus"])
        expect(await hasLlmProvider(projectRoot, "anthropic")).toBe(false)
    })

    test("makes the employees running on it follow", async () => {
        const renaming = await updateLlmProviderId(
            projectRoot,
            "anthropic",
            "a",
        )

        const employee = await loadEmployee(projectRoot, "claude")
        expect(employee).toEqual({ ...claude, providerId: "a" })
        expect(renaming.updatedEmployeeIds).toEqual(["claude"])
    })

    test("refuses an id another provider has", async () => {
        const updating = updateLlmProviderId(projectRoot, "anthropic", "ollama")

        await expect(updating).rejects.toThrow(UserError)
        await expect(updating).rejects.toThrow('"ollama" already exists.')
        expect(await hasLlmProvider(projectRoot, "anthropic")).toBe(true)
    })

    test("refuses a new id that is not kebab-case", async () => {
        const updating = updateLlmProviderId(projectRoot, "anthropic", "A")

        await expect(updating).rejects.toThrow('Invalid provider id "A"')
    })

    test("refuses an unknown provider", async () => {
        const updating = updateLlmProviderId(projectRoot, "openai", "oai")

        await expect(updating).rejects.toThrow('No provider "openai".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const updating = updateLlmProviderId(
            folderWithoutCompany,
            "anthropic",
            "a",
        )

        await expect(updating).rejects.toThrow("Run `aico init` first.")
    })
})
