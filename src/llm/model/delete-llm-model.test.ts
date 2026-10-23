import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { saveEmployee } from "../../organization/employee/storage.ts"
import { UserError } from "../../user-error.ts"
import { saveLlmProvider } from "../provider/storage.ts"
import { deleteLlmModel } from "./delete-llm-model.ts"
import { hasLlmModel, saveLlmModel } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await saveLlmProvider(projectRoot, { id: "ollama", name: "Ollama" })
    await saveLlmModel(projectRoot, {
        providerId: "ollama",
        id: "llama",
        name: "Llama",
        apiId: "llama3.1:8b",
        protocol: "openai-chat-completions",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("deleteLlmModel", () => {
    test("deletes a model no employee runs on, and returns it", async () => {
        const model = await deleteLlmModel(projectRoot, "ollama", "llama")

        expect(await hasLlmModel(projectRoot, "ollama", "llama")).toBe(false)
        expect(model.name).toBe("Llama")
    })

    test("refuses a model an employee runs on", async () => {
        await saveEmployee(projectRoot, {
            id: "lucie",
            name: "Lucie",
            kind: "llm",
            providerId: "ollama",
            modelId: "llama",
        })

        const deletion = deleteLlmModel(projectRoot, "ollama", "llama")

        await expect(deletion).rejects.toThrow(UserError)
        await expect(deletion).rejects.toThrow("is used by lucie.")
        expect(await hasLlmModel(projectRoot, "ollama", "llama")).toBe(true)
    })

    test("refuses a model the provider doesn't have", async () => {
        const deletion = deleteLlmModel(projectRoot, "ollama", "qwen")

        await expect(deletion).rejects.toThrow('has no model "qwen"')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const deletion = deleteLlmModel(folderWithoutCompany, "ollama", "llama")

        await expect(deletion).rejects.toThrow("Run `aico init` first.")
    })
})
