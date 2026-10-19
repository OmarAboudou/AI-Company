import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../user-error.ts"
import type { LlmModel } from "./llm-model.ts"
import {
    copyLlmModel,
    deleteLlmModel,
    listLlmModels,
    llmModelExists,
    loadLlmModel,
    saveLlmModel,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const opus: LlmModel = {
    providerId: "anthropic",
    id: "claude-opus-5-5",
    name: "Claude Opus 5.5",
    apiId: "claude-opus-5-5",
    protocol: "anthropic-messages",
}

const haiku: LlmModel = {
    providerId: "anthropic",
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    apiId: "claude-haiku-4-5-20251001",
    protocol: "anthropic-messages",
}

const llama: LlmModel = {
    providerId: "ollama",
    id: "llama-3-1-8b",
    name: "Llama 3.1 8B",
    apiId: "llama3.1:8b",
    protocol: "anthropic-messages",
}

describe("saveLlmModel", () => {
    test("writes config.json in the provider's models folder", async () => {
        await saveLlmModel(projectRoot, llama)

        const path = join(
            projectRoot,
            ".llmco",
            "llm-providers",
            "ollama",
            "models",
            "llama-3-1-8b",
            "config.json",
        )
        const config = await Bun.file(path).text()

        expect(config).toBe(
            '{\n    "name": "Llama 3.1 8B",\n    "apiId": "llama3.1:8b",\n    "protocol": "anthropic-messages"\n}\n',
        )
    })
})

describe("loadLlmModel", () => {
    test("reads back what saveLlmModel wrote", async () => {
        await saveLlmModel(projectRoot, llama)

        const loaded = await loadLlmModel(projectRoot, "ollama", llama.id)

        expect(loaded).toEqual(llama)
    })

    test("rejects an invalid config.json", async () => {
        const dir = join(projectRoot, ".llmco", "llm-providers", "ollama")
        await Bun.write(
            join(dir, "models", "llama", "config.json"),
            JSON.stringify({ name: "Llama" }),
        )

        const loading = loadLlmModel(projectRoot, "ollama", "llama")

        await expect(loading).rejects.toThrow(UserError)
    })

    test("fails when the model does not exist", async () => {
        const loading = loadLlmModel(projectRoot, "ollama", "llama")

        await expect(loading).rejects.toThrow(UserError)
    })
})

describe("llmModelExists", () => {
    test("is false before saving and true after", async () => {
        const before = await llmModelExists(projectRoot, "ollama", llama.id)
        await saveLlmModel(projectRoot, llama)
        const after = await llmModelExists(projectRoot, "ollama", llama.id)

        expect(before).toBe(false)
        expect(after).toBe(true)
    })

    test("only looks in the given provider", async () => {
        await saveLlmModel(projectRoot, llama)

        expect(await llmModelExists(projectRoot, "groq", llama.id)).toBe(false)
    })
})

describe("listLlmModels", () => {
    test("is empty for a provider without models", async () => {
        expect(await listLlmModels(projectRoot, "anthropic")).toEqual([])
    })

    test("returns the provider's models sorted by id", async () => {
        await Promise.all([
            saveLlmModel(projectRoot, opus),
            saveLlmModel(projectRoot, haiku),
            saveLlmModel(projectRoot, llama),
        ])

        const models = await listLlmModels(projectRoot, "anthropic")

        expect(models).toEqual([haiku, opus])
    })
})

describe("deleteLlmModel", () => {
    test("removes the model's folder, not its provider's other models", async () => {
        await Promise.all([
            saveLlmModel(projectRoot, opus),
            saveLlmModel(projectRoot, haiku),
        ])

        const before = await listLlmModels(projectRoot, "anthropic")

        await deleteLlmModel(projectRoot, "anthropic", opus.id)
        const after = await listLlmModels(projectRoot, "anthropic")

        expect(before).toEqual([haiku, opus])
        expect(after).toEqual([haiku])
    })
})

describe("copyLlmModel", () => {
    test("copies the model's folder under its new id", async () => {
        await saveLlmModel(projectRoot, opus)
        const before = await listLlmModels(projectRoot, "anthropic")

        await copyLlmModel(projectRoot, "anthropic", opus.id, "opus-5-5")
        const after = await listLlmModels(projectRoot, "anthropic")

        expect(before).toEqual([opus])
        expect(after).toEqual([opus, { ...opus, id: "opus-5-5" }])
    })
})
