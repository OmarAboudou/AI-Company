import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { saveLlmModel } from "../../llm/model/storage.ts"
import { saveLlmProvider } from "../../llm/provider/storage.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { requireEmployeeModel } from "./require-employee-model.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await saveLlmProvider(projectRoot, { id: "anthropic", name: "Anthropic" })
    await saveLlmModel(projectRoot, {
        providerId: "anthropic",
        id: "opus",
        name: "Claude Opus 5.5",
        apiId: "claude-opus-5-5",
        protocol: "anthropic-messages",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function createLlmConfig(providerId: string, modelId: string) {
    return { name: "Claude", kind: "llm", providerId, modelId } as const
}

describe("requireEmployeeModel", () => {
    test("accepts an LLM employee running on an existing model", async () => {
        const claude = createLlmConfig("anthropic", "opus")

        const checking = requireEmployeeModel(projectRoot, claude)

        await expect(checking).resolves.toBeUndefined()
    })

    test("refuses a model its provider doesn't have", async () => {
        const claude = createLlmConfig("anthropic", "haiku")

        const checking = requireEmployeeModel(projectRoot, claude)

        await expect(checking).rejects.toThrow('has no model "haiku"')
    })

    test("refuses an unknown provider", async () => {
        const claude = createLlmConfig("openai", "opus")

        const checking = requireEmployeeModel(projectRoot, claude)

        await expect(checking).rejects.toThrow('No provider "openai".')
    })
})
