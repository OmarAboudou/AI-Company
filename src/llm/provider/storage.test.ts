import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import type { LlmModel } from "../model/schema.ts"
import { listLlmModels, saveLlmModel } from "../model/storage.ts"
import type { LlmProvider } from "./schema.ts"
import {
    copyLlmProviderFolder,
    deleteLlmProviderFolder,
    hasLlmProvider,
    listLlmProviders,
    loadLlmProvider,
    saveLlmProvider,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const anthropic: LlmProvider = { id: "anthropic", name: "Anthropic" }

const ollama: LlmProvider = { id: "ollama", name: "Ollama" }

describe("saveLlmProvider", () => {
    test("writes config.json in a folder named after the id", async () => {
        await saveLlmProvider(projectRoot, anthropic)

        const configPath = join(
            projectRoot,
            ".llmco",
            "llm-providers",
            "anthropic",
            "config.json",
        )
        const configText = await Bun.file(configPath).text()

        expect(configText).toBe('{\n    "name": "Anthropic"\n}\n')
    })
})

describe("loadLlmProvider", () => {
    test("reads back what saveLlmProvider wrote", async () => {
        await saveLlmProvider(projectRoot, anthropic)

        const loadedProvider = await loadLlmProvider(projectRoot, "anthropic")

        expect(loadedProvider).toEqual(anthropic)
    })

    test("rejects an invalid config.json", async () => {
        await Bun.write(
            join(projectRoot, ".llmco", "llm-providers", "x", "config.json"),
            JSON.stringify({ name: "" }),
        )

        const loading = loadLlmProvider(projectRoot, "x")

        await expect(loading).rejects.toThrow(UserError)
    })

    test("fails when the provider does not exist", async () => {
        const loading = loadLlmProvider(projectRoot, "anthropic")

        await expect(loading).rejects.toThrow(UserError)
    })
})

describe("hasLlmProvider", () => {
    test("is false before saving and true after", async () => {
        expect(await hasLlmProvider(projectRoot, "anthropic")).toBe(false)

        await saveLlmProvider(projectRoot, anthropic)

        expect(await hasLlmProvider(projectRoot, "anthropic")).toBe(true)
    })
})

describe("listLlmProviders", () => {
    test("is empty when no provider was ever created", async () => {
        expect(await listLlmProviders(projectRoot)).toEqual([])
    })

    test("returns every provider sorted by id", async () => {
        await saveLlmProvider(projectRoot, ollama)
        await saveLlmProvider(projectRoot, anthropic)

        expect(await listLlmProviders(projectRoot)).toEqual([anthropic, ollama])
    })
})

describe("deleteLlmProviderFolder", () => {
    test("removes the provider's folder, models included", async () => {
        const opus: LlmModel = {
            providerId: "anthropic",
            id: "claude-opus-5-5",
            name: "Claude Opus 5.5",
            apiId: "claude-opus-5-5",
            protocol: "anthropic-messages",
        }
        await Promise.all([
            saveLlmProvider(projectRoot, anthropic),
            saveLlmModel(projectRoot, opus),
        ])

        const listProvidersAndModels = () =>
            Promise.all([
                listLlmProviders(projectRoot),
                listLlmModels(projectRoot, "anthropic"),
            ])
        const before = await listProvidersAndModels()

        await deleteLlmProviderFolder(projectRoot, "anthropic")
        const after = await listProvidersAndModels()

        expect(before).toEqual([[anthropic], [opus]])
        expect(after).toEqual([[], []])
    })
})

describe("copyLlmProviderFolder", () => {
    test("copies the provider's folder, models included", async () => {
        const opus: LlmModel = {
            providerId: "anthropic",
            id: "claude-opus-5-5",
            name: "Claude Opus 5.5",
            apiId: "claude-opus-5-5",
            protocol: "anthropic-messages",
        }
        await Promise.all([
            saveLlmProvider(projectRoot, anthropic),
            saveLlmModel(projectRoot, opus),
        ])
        const before = await listLlmProviders(projectRoot)

        await copyLlmProviderFolder(projectRoot, "anthropic", "claude-api")
        const after = await listLlmProviders(projectRoot)
        const models = await listLlmModels(projectRoot, "claude-api")

        expect(before).toEqual([anthropic])
        expect(after).toEqual([anthropic, { ...anthropic, id: "claude-api" }])
        expect(models).toEqual([{ ...opus, providerId: "claude-api" }])
    })
})
