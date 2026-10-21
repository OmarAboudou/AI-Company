import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { appendStateLine } from "./append-state-line.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function getStatePath(...segments: string[]): string {
    return join(projectRoot, ".llmco", ".state", ...segments)
}

describe("appendStateLine", () => {
    test("adds one JSON line at the end of the file", async () => {
        const path = getStatePath("runs", "20261018-140324-000-1b2c.jsonl")

        await appendStateLine(projectRoot, path, { type: "user" })
        await appendStateLine(projectRoot, path, { type: "assistant" })

        const text = await Bun.file(path).text()
        expect(text).toBe('{"type":"user"}\n{"type":"assistant"}\n')
    })

    test("writes the .gitignore ignoring the whole state folder", async () => {
        const path = getStatePath("runs", "20261018-140324-000-1b2c.jsonl")

        await appendStateLine(projectRoot, path, { type: "user" })

        const gitignorePath = getStatePath(".gitignore")
        const gitignoreContent = await Bun.file(gitignorePath).text()
        expect(gitignoreContent.split("\n")).toContain("*")
    })
})
