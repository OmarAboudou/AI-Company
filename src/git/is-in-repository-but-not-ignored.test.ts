import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { isInRepositoryButNotIgnored } from "./is-in-repository-but-not-ignored.ts"
import { spawnGit } from "./spawn-git.ts"

let folderPath: string

beforeEach(async () => {
    folderPath = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
})

function runGitInFolder(...args: string[]) {
    spawnGit(folderPath, args)
}

describe("isInRepositoryButNotIgnored", () => {
    test("is true for a file the repository doesn't ignore", async () => {
        runGitInFolder("init", "-q")
        const keyPath = join(folderPath, "key")
        await Bun.write(keyPath, "sk")

        expect(isInRepositoryButNotIgnored(folderPath, keyPath)).toBe(true)
    })

    test("is false for an ignored file", async () => {
        runGitInFolder("init", "-q")
        await Bun.write(join(folderPath, ".gitignore"), "secrets/\n")
        const path = join(folderPath, "secrets", "key")

        expect(isInRepositoryButNotIgnored(folderPath, path)).toBe(false)
    })

    test("is false for a file outside the repository", async () => {
        runGitInFolder("init", "-q", "repository")
        const repositoryPath = join(folderPath, "repository")

        const isInRepository = isInRepositoryButNotIgnored(
            repositoryPath,
            folderPath,
        )

        expect(isInRepository).toBe(false)
    })
})
