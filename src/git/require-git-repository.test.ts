import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../user-error.ts"
import { requireGitRepository } from "./require-git-repository.ts"
import { spawnGit } from "./spawn-git.ts"

let folderPath: string

beforeEach(async () => {
    folderPath = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
})

function runGitInFolder(...args: string[]) {
    spawnGit(folderPath, args)
}

describe("requireGitRepository", () => {
    test("refuses a directory outside any git repository", () => {
        const requireFolder = () => requireGitRepository(folderPath)

        expect(requireFolder).toThrow(UserError)
        expect(requireFolder).toThrow("Run `git init` first")
    })

    test("accepts a git repository and its subdirectories", async () => {
        runGitInFolder("init", "-q")
        const subfolderPath = join(folderPath, "src")
        await mkdir(subfolderPath)

        expect(() => requireGitRepository(folderPath)).not.toThrow()
        expect(() => requireGitRepository(subfolderPath)).not.toThrow()
    })
})
