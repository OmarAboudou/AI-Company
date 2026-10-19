import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { loadLlmProvider } from "../provider/storage.ts"
import { saveLlmConnections } from "./save-llm-connections.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const anthropic = { id: "anthropic", name: "Anthropic" }

describe("saveLlmConnections", () => {
    test("saves the provider with its new connections", async () => {
        const connections = {
            "anthropic-messages": { baseUrl: "https://api.anthropic.com" },
        }

        await saveLlmConnections(projectRoot, anthropic, connections)

        const provider = await loadLlmProvider(projectRoot, "anthropic")
        expect(provider).toEqual({ ...anthropic, connections })
    })

    test("refuses an invalid connection", async () => {
        const connections = { "anthropic-messages": { baseUrl: "ftp://x" } }

        const saving = saveLlmConnections(projectRoot, anthropic, connections)

        await expect(saving).rejects.toThrow(UserError)
    })
})
