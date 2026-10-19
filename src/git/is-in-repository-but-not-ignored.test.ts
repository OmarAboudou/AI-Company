import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { isInRepositoryButNotIgnored } from "./is-in-repository-but-not-ignored.ts"

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

describe("isInRepositoryButNotIgnored", () => {
    test("is true for a file the repository doesn't ignore", async () => {
        git("init", "-q")
        await Bun.write(join(dir, "key"), "sk")

        expect(isInRepositoryButNotIgnored(dir, join(dir, "key"))).toBe(true)
    })

    test("is false for an ignored file", async () => {
        git("init", "-q")
        await Bun.write(join(dir, ".gitignore"), "secrets/\n")
        const path = join(dir, "secrets", "key")

        expect(isInRepositoryButNotIgnored(dir, path)).toBe(false)
    })

    test("is false for a file outside the repository", async () => {
        git("init", "-q", "repository")
        const repository = join(dir, "repository")

        expect(isInRepositoryButNotIgnored(repository, dir)).toBe(false)
    })
})
