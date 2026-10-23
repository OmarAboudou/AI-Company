import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { loadExistingLlmProvider } from "./load-existing-llm-provider.ts"
import { saveLlmProvider } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("loadExistingLlmProvider", () => {
    test("loads the provider the id names", async () => {
        const anthropic = { id: "anthropic", name: "Anthropic" }
        await saveLlmProvider(projectRoot, anthropic)

        const provider = await loadExistingLlmProvider(projectRoot, "anthropic")

        expect(provider).toEqual(anthropic)
    })

    test("refuses an unknown provider, saying how to list them", async () => {
        const loading = loadExistingLlmProvider(projectRoot, "anthropic")

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow("Run `aico provider list`.")
    })

    test("refuses an id that is not kebab-case", async () => {
        const loading = loadExistingLlmProvider(projectRoot, "Anthropic")

        await expect(loading).rejects.toThrow('Invalid provider id "Anthropic"')
    })
})
