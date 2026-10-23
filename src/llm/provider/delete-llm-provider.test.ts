import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { saveEmployee } from "../../organization/employee/storage.ts"
import { UserError } from "../../user-error.ts"
import { saveLlmModel } from "../model/storage.ts"
import { deleteLlmProvider } from "./delete-llm-provider.ts"
import { hasLlmProvider, saveLlmProvider } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await saveLlmProvider(projectRoot, { id: "ollama", name: "Ollama" })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const forceOptions = { shouldForce: true }

function saveModel(id: string) {
    return saveLlmModel(projectRoot, {
        providerId: "ollama",
        id,
        name: id,
        apiId: id,
        protocol: "anthropic-messages",
    })
}

describe("deleteLlmProvider", () => {
    test("deletes a provider without models", async () => {
        const deletion = await deleteLlmProvider(projectRoot, "ollama")

        expect(await hasLlmProvider(projectRoot, "ollama")).toBe(false)
        expect(deletion.deletedModelIds).toEqual([])
    })

    test("refuses a provider with models unless forced", async () => {
        await saveModel("llama")

        const deletion = deleteLlmProvider(projectRoot, "ollama")

        await expect(deletion).rejects.toThrow(UserError)
        await expect(deletion).rejects.toThrow("has models llama. Add --force")
        expect(await hasLlmProvider(projectRoot, "ollama")).toBe(true)
    })

    test("deletes a provider with its models when forced", async () => {
        await Promise.all([saveModel("llama"), saveModel("qwen")])

        const deletion = await deleteLlmProvider(
            projectRoot,
            "ollama",
            forceOptions,
        )

        expect(await hasLlmProvider(projectRoot, "ollama")).toBe(false)
        expect(deletion.deletedModelIds).toEqual(["llama", "qwen"])
    })

    test("refuses a provider an employee runs on, even forced", async () => {
        await saveModel("llama")
        await saveEmployee(projectRoot, {
            id: "claude",
            name: "Claude",
            kind: "llm",
            providerId: "ollama",
            modelId: "llama",
        })

        const deletion = deleteLlmProvider(projectRoot, "ollama", forceOptions)

        await expect(deletion).rejects.toThrow("is used by claude.")
        await expect(deletion).rejects.toThrow("--force doesn't change that.")
    })

    test("refuses an unknown provider", async () => {
        const deletion = deleteLlmProvider(projectRoot, "openai")

        await expect(deletion).rejects.toThrow('No provider "openai".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const deletion = deleteLlmProvider(folderWithoutCompany, "ollama")

        await expect(deletion).rejects.toThrow("Run `aico init` first.")
    })
})
