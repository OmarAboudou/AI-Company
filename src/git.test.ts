import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "./errors.ts"
import { gitConfig, requireGitRepository } from "./git.ts"

let dir: string

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
})

function git(...args: string[]) {
    Bun.spawnSync(["git", ...args], { cwd: dir })
}

describe("requireGitRepository", () => {
    test("refuses a directory outside any git repository", () => {
        expect(() => requireGitRepository(dir)).toThrow(UserError)
        expect(() => requireGitRepository(dir)).toThrow("Run `git init` first")
    })

    test("accepts a git repository and its subdirectories", async () => {
        git("init", "-q")
        await mkdir(join(dir, "src"))

        expect(() => requireGitRepository(dir)).not.toThrow()
        expect(() => requireGitRepository(join(dir, "src"))).not.toThrow()
    })
})

describe("gitConfig", () => {
    test("reads a value set in the repository", () => {
        git("init", "-q")
        git("config", "user.name", "Test User")

        expect(gitConfig(dir, "user.name")).toBe("Test User")
    })

    test("is undefined for a key that isn't set", () => {
        git("init", "-q")

        expect(gitConfig(dir, "llmco.nothing")).toBeUndefined()
    })
})
