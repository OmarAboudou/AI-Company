import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { saveLlmProvider } from "../provider/storage.ts"
import { loadExistingLlmModel } from "./load-existing-llm-model.ts"
import { saveLlmModel } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
    await saveLlmProvider(projectRoot, { id: "anthropic", name: "Anthropic" })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const opus = {
    providerId: "anthropic",
    id: "opus",
    name: "Claude Opus 5.5",
    apiId: "claude-opus-5-5",
    protocol: "anthropic-messages",
} as const

describe("loadExistingLlmModel", () => {
    test("loads the model of the provider the ids name", async () => {
        await saveLlmModel(projectRoot, opus)

        const model = await loadExistingLlmModel(
            projectRoot,
            "anthropic",
            "opus",
        )

        expect(model).toEqual(opus)
    })

    test("refuses a model the provider doesn't have", async () => {
        const loading = loadExistingLlmModel(projectRoot, "anthropic", "opus")

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow('has no model "opus"')
    })

    test("refuses an unknown provider", async () => {
        const loading = loadExistingLlmModel(projectRoot, "openai", "opus")

        await expect(loading).rejects.toThrow('No provider "openai".')
    })
})
