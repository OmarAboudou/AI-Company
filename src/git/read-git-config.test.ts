import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { gitConfig } from "./read-git-config.ts"

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
