import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { readApiKey } from "./read-api-key.ts"
import type { LlmProvider } from "./schema.ts"

const variableName = "LLMCO_TEST_API_KEY"
let projectRoot: string
let outsideFolderPath: string

beforeEach(async () => {
    ;[projectRoot, outsideFolderPath] = await Promise.all([
        mkdtemp(join(tmpdir(), "llmco-")),
        mkdtemp(join(tmpdir(), "llmco-keys-")),
    ])
    Bun.spawnSync(["git", "init", "-q"], { cwd: projectRoot })
})

afterEach(async () => {
    delete process.env[variableName]
    await Promise.all(
        [projectRoot, outsideFolderPath].map((folderPath) =>
            rm(folderPath, { recursive: true, force: true }),
        ),
    )
})

function createProviderReadingFrom(
    apiKeySource: LlmProvider["apiKeySource"],
): LlmProvider {
    return { id: "anthropic", name: "Anthropic", apiKeySource }
}

describe("readApiKey", () => {
    test("is none for a provider without API key", async () => {
        const apiKey = await readApiKey(
            projectRoot,
            createProviderReadingFrom(undefined),
        )

        expect(apiKey).toBeUndefined()
    })

    test("reads the environment variable the provider names", async () => {
        process.env[variableName] = " sk-from-env\n"
        const provider = createProviderReadingFrom({
            kind: "env",
            variable: variableName,
        })

        expect(await readApiKey(projectRoot, provider)).toBe("sk-from-env")
    })

    test("refuses an environment variable that isn't set", async () => {
        const provider = createProviderReadingFrom({
            kind: "env",
            variable: variableName,
        })

        const reading = readApiKey(projectRoot, provider)

        const refusalMessage = `${variableName}, which isn't set.`

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("reads a file outside the repository", async () => {
        const keyPath = join(outsideFolderPath, "anthropic")
        await Bun.write(keyPath, "sk-from-file\n")
        const provider = createProviderReadingFrom({
            kind: "file",
            path: keyPath,
        })

        expect(await readApiKey(projectRoot, provider)).toBe("sk-from-file")
    })

    test("refuses a file of the repository that git doesn't ignore", async () => {
        await Bun.write(join(projectRoot, "secrets", "anthropic"), "sk")
        const keyPath = "secrets/anthropic"
        const provider = createProviderReadingFrom({
            kind: "file",
            path: keyPath,
        })

        const reading = readApiKey(projectRoot, provider)

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow("not ignored by git")
    })

    test("reads a file of the repository that git ignores, from its root", async () => {
        await Bun.write(join(projectRoot, "secrets", "anthropic"), "sk-in")
        await Bun.write(join(projectRoot, ".gitignore"), "secrets/\n")
        const keyPath = "secrets/anthropic"
        const provider = createProviderReadingFrom({
            kind: "file",
            path: keyPath,
        })

        expect(await readApiKey(projectRoot, provider)).toBe("sk-in")
    })

    test("refuses an empty file", async () => {
        const keyPath = join(outsideFolderPath, "anthropic")
        await Bun.write(keyPath, "\n")
        const provider = createProviderReadingFrom({
            kind: "file",
            path: keyPath,
        })

        const reading = readApiKey(projectRoot, provider)

        await expect(reading).rejects.toThrow("which is empty.")
    })
})
