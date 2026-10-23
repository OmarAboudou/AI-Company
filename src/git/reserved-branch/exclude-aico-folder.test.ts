import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createGitRepository } from "../create-git-repository.testing.ts"
import { runGit } from "../run-git.ts"
import { excludeAicoFolder } from "./exclude-aico-folder.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
    createGitRepository(projectRoot, {
        name: "Test User",
        email: "test@example.com",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function readExcludeFile() {
    return Bun.file(join(projectRoot, ".git", "info", "exclude")).text()
}

describe("excludeAicoFolder", () => {
    test("hides .aico/ from git, in this repository only", async () => {
        await Bun.write(join(projectRoot, ".aico", "note.md"), "Hono.\n")
        const before = runGit(projectRoot, ["status", "--porcelain"])

        await excludeAicoFolder(projectRoot)

        expect(before).toBe("?? .aico/")
        expect(runGit(projectRoot, ["status", "--porcelain"])).toBe("")
    })

    test("adds its line once, after the lines already there", async () => {
        const excludeFilePath = join(projectRoot, ".git", "info", "exclude")
        await Bun.write(excludeFilePath, "*.log")

        await excludeAicoFolder(projectRoot)
        await excludeAicoFolder(projectRoot)

        const lines = (await readExcludeFile()).split("\n")
        expect(lines[0]).toBe("*.log")
        expect(lines.filter((line) => line === ".aico/")).toHaveLength(1)
    })
})
