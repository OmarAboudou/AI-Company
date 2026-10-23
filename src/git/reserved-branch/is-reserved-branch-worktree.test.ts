import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
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
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("isReservedBranchWorktree", () => {
    test("is true for the worktree createReservedBranch checks out", async () => {
        await createReservedBranch(projectRoot)

        expect(await isReservedBranchWorktree(projectRoot)).toBe(true)
    })

    test("is false without .aico/", async () => {
        expect(await isReservedBranchWorktree(projectRoot)).toBe(false)
    })

    test("is false for a .aico/ folder of the project's own working copy", async () => {
        await mkdir(join(projectRoot, ".aico"))

        expect(await isReservedBranchWorktree(projectRoot)).toBe(false)
    })

    test("is false for a worktree of another branch", async () => {
        const notesBranchArgs = ["--orphan", "-b", "notes", ".aico"]
        runGit(projectRoot, ["worktree", "add", "-q", ...notesBranchArgs])

        expect(await isReservedBranchWorktree(projectRoot)).toBe(false)
    })
})
