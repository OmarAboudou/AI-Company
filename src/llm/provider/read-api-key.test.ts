import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { readApiKey } from "./read-api-key.ts"
import type { LlmProvider } from "./schema.ts"

const variable = "LLMCO_TEST_API_KEY"
let projectRoot: string
let outside: string

beforeEach(async () => {
    ;[projectRoot, outside] = await Promise.all([
        mkdtemp(join(tmpdir(), "llmco-")),
        mkdtemp(join(tmpdir(), "llmco-keys-")),
    ])
    Bun.spawnSync(["git", "init", "-q"], { cwd: projectRoot })
})

afterEach(async () => {
    delete process.env[variable]
    await Promise.all(
        [projectRoot, outside].map((dir) =>
            rm(dir, { recursive: true, force: true }),
        ),
    )
})

function readingFrom(apiKey: LlmProvider["apiKey"]): LlmProvider {
    return { id: "anthropic", name: "Anthropic", apiKey }
}

describe("readApiKey", () => {
    test("is none for a provider without API key", async () => {
        const apiKey = await readApiKey(projectRoot, readingFrom(undefined))

        expect(apiKey).toBeUndefined()
    })

    test("reads the environment variable the provider names", async () => {
        process.env[variable] = " sk-from-env\n"
        const provider = readingFrom({ kind: "env", variable })

        expect(await readApiKey(projectRoot, provider)).toBe("sk-from-env")
    })

    test("refuses an environment variable that isn't set", async () => {
        const provider = readingFrom({ kind: "env", variable })

        const reading = readApiKey(projectRoot, provider)

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow(`${variable}, which isn't set.`)
    })

    test("reads a file outside the repository", async () => {
        const path = join(outside, "anthropic")
        await Bun.write(path, "sk-from-file\n")
        const provider = readingFrom({ kind: "file", path })

        expect(await readApiKey(projectRoot, provider)).toBe("sk-from-file")
    })

    test("refuses a file of the repository that git doesn't ignore", async () => {
        await Bun.write(join(projectRoot, "secrets", "anthropic"), "sk")
        const path = "secrets/anthropic"
        const provider = readingFrom({ kind: "file", path })

        const reading = readApiKey(projectRoot, provider)

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow("not ignored by git")
    })

    test("reads a file of the repository that git ignores, from its root", async () => {
        await Bun.write(join(projectRoot, "secrets", "anthropic"), "sk-in")
        await Bun.write(join(projectRoot, ".gitignore"), "secrets/\n")
        const path = "secrets/anthropic"
        const provider = readingFrom({ kind: "file", path })

        expect(await readApiKey(projectRoot, provider)).toBe("sk-in")
    })

    test("refuses an empty file", async () => {
        const path = join(outside, "anthropic")
        await Bun.write(path, "\n")
        const provider = readingFrom({ kind: "file", path })

        const reading = readApiKey(projectRoot, provider)

        await expect(reading).rejects.toThrow("which is empty.")
    })
})
