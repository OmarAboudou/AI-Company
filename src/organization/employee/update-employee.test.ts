import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { saveLlmModel } from "../../llm-model/storage.ts"
import { saveLlmProvider } from "../../llm-provider/storage.ts"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import type { Employee } from "./schema.ts"
import { loadEmployee, saveEmployee } from "./storage.ts"
import { updateEmployee } from "./update-employee.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveLlmProvider(projectRoot, { id: "anthropic", name: "Anthropic" }),
        saveLlmProvider(projectRoot, { id: "ollama", name: "Ollama" }),
        saveLlmModel(projectRoot, createModel("anthropic", "opus")),
        saveLlmModel(projectRoot, createModel("anthropic", "haiku")),
        saveLlmModel(projectRoot, createModel("ollama", "llama")),
        saveEmployee(projectRoot, claude),
        saveEmployee(projectRoot, omar),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function createModel(providerId: string, id: string) {
    const protocol = "anthropic-messages"
    return { providerId, id, name: id, apiId: id, protocol } as const
}

const claude: Employee = {
    id: "claude",
    name: "Claude",
    kind: "llm",
    providerId: "anthropic",
    modelId: "opus",
    createdAt: "2026-10-18T14:00:00.000Z",
    formerIds: [{ id: "claude-a", until: "2026-10-19T09:00:00.000Z" }],
}
const omar = { id: "omar", name: "Omar", kind: "human" } as const

describe("updateEmployee", () => {
    test("renames an LLM employee and keeps its model and history", async () => {
        await updateEmployee(projectRoot, "claude", { name: "Claude 2" })

        const employee = await loadEmployee(projectRoot, "claude")
        expect(employee).toEqual({ ...claude, name: "Claude 2" })
    })

    test("gives an LLM employee another model of its provider", async () => {
        await updateEmployee(projectRoot, "claude", { modelId: "haiku" })

        const employee = await loadEmployee(projectRoot, "claude")
        expect(employee).toEqual({ ...claude, modelId: "haiku" })
    })

    test("moves an LLM employee to another provider's model", async () => {
        const toLlama = { providerId: "ollama", modelId: "llama" }

        const updated = await updateEmployee(projectRoot, "claude", toLlama)

        expect(await loadEmployee(projectRoot, "claude")).toEqual(updated)
        expect(updated).toMatchObject(toLlama)
    })

    test("refuses a provider and model pair that doesn't exist", async () => {
        const toOllama = { providerId: "ollama" }

        const update = updateEmployee(projectRoot, "claude", toOllama)

        await expect(update).rejects.toThrow('"ollama" has no model "opus"')
        const employee = await loadEmployee(projectRoot, "claude")
        expect(employee).toEqual(claude)
    })

    test("refuses a provider or a model for a human", async () => {
        const update = updateEmployee(projectRoot, "omar", { modelId: "opus" })

        await expect(update).rejects.toThrow(UserError)
        await expect(update).rejects.toThrow("is a human")
    })

    test("renames a human", async () => {
        await updateEmployee(projectRoot, "omar", { name: "Omar Aboudou" })

        const employee = await loadEmployee(projectRoot, "omar")
        expect(employee).toEqual({ ...omar, name: "Omar Aboudou" })
    })

    test("refuses a blank name", async () => {
        const update = updateEmployee(projectRoot, "omar", { name: " " })

        await expect(update).rejects.toThrow(UserError)
    })

    test("refuses an unknown employee", async () => {
        const update = updateEmployee(projectRoot, "julie", { name: "J" })

        await expect(update).rejects.toThrow('No employee "julie".')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const update = updateEmployee(elsewhere, "omar", { name: "O" })

        await expect(update).rejects.toThrow("Run `llmco init` first.")
    })
})
