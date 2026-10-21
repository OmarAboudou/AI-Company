import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runGit } from "./run-git.ts"
import { spawnGit } from "./spawn-git.ts"

let folderPath: string
let otherFolderPath: string

beforeEach(async () => {
    ;[folderPath, otherFolderPath] = await Promise.all([
        mkdtemp(join(tmpdir(), "llmco-")),
        mkdtemp(join(tmpdir(), "llmco-other-")),
    ])
})

afterEach(async () => {
    await Promise.all(
        [folderPath, otherFolderPath].map((temporaryFolderPath) =>
            rm(temporaryFolderPath, { recursive: true, force: true }),
        ),
    )
})

describe("spawnGit", () => {
    const ownRepositoryTestName = "runs git in its folder's repository"

    test(ownRepositoryTestName, () => {
        spawnGit(folderPath, ["init", "-q"])
        spawnGit(folderPath, ["config", "user.name", "Test User"])

        const gitPath = runGit(folderPath, ["rev-parse", "--absolute-git-dir"])
        const userName = runGit(folderPath, ["config", "--local", "user.name"])
        expect(gitPath).toBe(join(folderPath, ".git"))
        expect(userName).toBe("Test User")
    })

    test("still does when bun test inherits GIT_DIR, as from a git hook", async () => {
        spawnGit(otherFolderPath, ["init", "-q"])
        const otherGitPath = join(otherFolderPath, ".git")
        const otherConfig = Bun.file(join(otherGitPath, "config"))
        const otherConfigBefore = await otherConfig.text()
        const hookEnvironment = { ...process.env, GIT_DIR: otherGitPath }
        const inheritingGit = Bun.spawnSync(
            ["git", "rev-parse", "--absolute-git-dir"],
            { cwd: folderPath, env: hookEnvironment },
        )
        const nameFilter = ["-t", ownRepositoryTestName]

        const testRun = Bun.spawnSync(
            [process.execPath, "test", import.meta.path, ...nameFilter],
            { env: hookEnvironment },
        )

        expect(inheritingGit.stdout.toString().trim()).toBe(otherGitPath)
        expect(testRun.exitCode).toBe(0)
        expect(await otherConfig.text()).toBe(otherConfigBefore)
    })
})
