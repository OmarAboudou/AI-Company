import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import {
    loadEmployee,
    saveEmployee,
} from "../../organization/employee/storage.ts"
import { UserError } from "../../user-error.ts"
import { saveLlmProvider } from "../provider/storage.ts"
import { hasLlmModel, loadLlmModel, saveLlmModel } from "./storage.ts"
import { updateLlmModelId } from "./update-llm-model-id.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await saveLlmProvider(projectRoot, { id: "ollama", name: "Ollama" })
    await Promise.all([
        saveModel("llama"),
        saveModel("qwen"),
        saveEmployee(projectRoot, {
            id: "lucie",
            name: "Lucie",
            kind: "llm",
            providerId: "ollama",
            modelId: "llama",
        }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function saveModel(id: string) {
    return saveLlmModel(projectRoot, {
        providerId: "ollama",
        id,
        name: id,
        apiId: id,
        protocol: "openai-chat-completions",
    })
}

function renameLlama(newId: string) {
    return updateLlmModelId(projectRoot, "ollama", "llama", newId)
}

describe("updateLlmModelId", () => {
    test("moves the model to its new id", async () => {
        await renameLlama("llama-3")

        const model = await loadLlmModel(projectRoot, "ollama", "llama-3")
        expect(model.apiId).toBe("llama")
        expect(await hasLlmModel(projectRoot, "ollama", "llama")).toBe(false)
    })

    test("makes the employees running on it follow", async () => {
        const outcome = await renameLlama("l")

        const employee = await loadEmployee(projectRoot, "lucie")
        expect(employee).toMatchObject({ modelId: "l" })
        expect(outcome.updatedEmployeeIds).toEqual(["lucie"])
    })

    test("refuses an id another model of the provider has", async () => {
        const update = renameLlama("qwen")

        await expect(update).rejects.toThrow(UserError)
        await expect(update).rejects.toThrow('already has a model "qwen".')
    })

    test("refuses a new id that is not kebab-case", async () => {
        const update = renameLlama("L")

        await expect(update).rejects.toThrow('Invalid model id "L"')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const update = updateLlmModelId(elsewhere, "ollama", "llama", "l")

        await expect(update).rejects.toThrow("Run `llmco init` first.")
    })
})
