import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readGitConfig } from "./read-git-config.ts"
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

describe("readGitConfig", () => {
    test("reads a value set in the repository", () => {
        runGitInFolder("init", "-q")
        runGitInFolder("config", "user.name", "Test User")

        expect(readGitConfig(folderPath, "user.name")).toBe("Test User")
    })

    test("is undefined for a key that isn't set", () => {
        runGitInFolder("init", "-q")

        expect(readGitConfig(folderPath, "aico.nothing")).toBeUndefined()
    })
})
