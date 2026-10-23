import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createGitRepository } from "../create-git-repository.testing.ts"
import { runGit } from "../run-git.ts"
import { createReservedBranch } from "./create-reserved-branch.ts"
import { isReservedBranchWorktree } from "./is-reserved-branch-worktree.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
    createGitRepository(projectRoot, {
        name: "Test User",
        email: "test@example.com",
    })
    await Bun.write(join(projectRoot, "README.md"), "# Acme\n")
    runGit(projectRoot, ["add", "README.md"])
    runGit(projectRoot, ["commit", "-q", "-m", "Start the project"])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function runGitInData(...args: string[]) {
    return runGit(join(projectRoot, ".aico"), args)
}

describe("createReservedBranch", () => {
    test("checks out branch aico/data in .aico/", async () => {
        await createReservedBranch(projectRoot)

        expect(await isReservedBranchWorktree(projectRoot)).toBe(true)
    })

    test("starts the branch without any history in common with the project", async () => {
        await createReservedBranch(projectRoot)
        await Bun.write(join(projectRoot, ".aico", "note.md"), "Hono.\n")
        runGitInData("add", "note.md")
        runGitInData("commit", "-q", "-m", "Write a note")

        const mergeBaseArgs = ["merge-base", "HEAD", "aico/data"]
        const commonCommit = runGit(projectRoot, mergeBaseArgs)
        const dataFiles = runGitInData("ls-files")
        expect(commonCommit).toBeUndefined()
        expect(dataFiles).toBe("note.md")
    })

    test("leaves the project's working copy clean", async () => {
        await createReservedBranch(projectRoot)

        expect(runGit(projectRoot, ["status", "--porcelain"])).toBe("")
    })

    test("checks the branch out in an empty .aico/ folder", async () => {
        await mkdir(join(projectRoot, ".aico"))

        await createReservedBranch(projectRoot)

        expect(await isReservedBranchWorktree(projectRoot)).toBe(true)
    })

    test("refuses an existing .aico/ folder, which isn't the branch's worktree", async () => {
        await mkdir(join(projectRoot, ".aico", "company"), { recursive: true })

        const creation = createReservedBranch(projectRoot)

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow("move it away")
        expect(await isReservedBranchWorktree(projectRoot)).toBe(false)
    })
})
