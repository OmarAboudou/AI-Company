import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createGitRepository } from "../create-git-repository.testing.ts"
import { runGit } from "../run-git.ts"
import { createReservedBranch } from "./create-reserved-branch.ts"
import { isReservedBranchWorktree } from "./is-reserved-branch-worktree.ts"
import { openReservedBranch } from "./open-reserved-branch.ts"

let parentFolderPath: string
let projectRoot: string
let clonePath: string

beforeEach(async () => {
    parentFolderPath = await mkdtemp(join(tmpdir(), "aico-"))
    projectRoot = join(parentFolderPath, "acme")
    clonePath = join(parentFolderPath, "clone")
    await mkdir(projectRoot)
    createGitRepository(projectRoot, {
        name: "Test User",
        email: "test@example.com",
    })
    await createReservedBranch(projectRoot)
    await Bun.write(join(projectRoot, ".aico", "note.md"), "Hono.\n")
    runGit(join(projectRoot, ".aico"), ["add", "note.md"])
    runGit(join(projectRoot, ".aico"), ["commit", "-q", "-m", "Write a note"])
})

afterEach(async () => {
    await rm(parentFolderPath, { recursive: true, force: true })
})

function cloneProject() {
    runGit(parentFolderPath, ["clone", "-q", projectRoot, clonePath])
}

function readNote(folderPath: string) {
    return Bun.file(join(folderPath, ".aico", "note.md")).text()
}

describe("openReservedBranch", () => {
    test("checks the branch out again in .aico/, deleted by hand", async () => {
        await rm(join(projectRoot, ".aico"), { recursive: true })

        await openReservedBranch(projectRoot)

        expect(await isReservedBranchWorktree(projectRoot)).toBe(true)
        expect(await readNote(projectRoot)).toBe("Hono.\n")
    })

    test("checks out, in a clone, the branch of the repository it comes from", async () => {
        cloneProject()

        await openReservedBranch(clonePath)

        const upstreamArgs = ["rev-parse", "--abbrev-ref", "aico/data@{u}"]
        expect(await isReservedBranchWorktree(clonePath)).toBe(true)
        expect(await readNote(clonePath)).toBe("Hono.\n")
        expect(runGit(clonePath, upstreamArgs)).toBe("origin/aico/data")
        expect(runGit(clonePath, ["status", "--porcelain"])).toBe("")
    })

    test("opens nothing in a repository without the branch", async () => {
        const otherProjectRoot = join(parentFolderPath, "other")
        await mkdir(otherProjectRoot)
        runGit(otherProjectRoot, ["init", "-q"])

        await openReservedBranch(otherProjectRoot)

        expect(await isReservedBranchWorktree(otherProjectRoot)).toBe(false)
    })

    test("leaves alone a .aico/ folder that holds something", async () => {
        cloneProject()
        await Bun.write(join(clonePath, ".aico", "note.md"), "Express.\n")

        await openReservedBranch(clonePath)

        expect(await isReservedBranchWorktree(clonePath)).toBe(false)
        expect(await readNote(clonePath)).toBe("Express.\n")
    })

    test("refuses a branch checked out in another working copy, saying where", async () => {
        const otherCopyPath = join(parentFolderPath, "acme-review")
        const orphanCopyArgs = ["--orphan", "-b", "review", otherCopyPath]
        runGit(projectRoot, ["worktree", "add", "-q", ...orphanCopyArgs])

        const opening = openReservedBranch(otherCopyPath)

        await expect(opening).rejects.toThrow(UserError)
        await expect(opening).rejects.toThrow(`run AICo from ${projectRoot}.`)
    })

    test("opens nothing from a folder that isn't a working copy's top", async () => {
        const subfolderPath = join(projectRoot, "src")
        await mkdir(subfolderPath)

        await openReservedBranch(subfolderPath)

        expect(await isReservedBranchWorktree(subfolderPath)).toBe(false)
    })

    test("refuses a branch on several remotes, saying how to choose", async () => {
        cloneProject()
        runGit(clonePath, ["remote", "add", "mirror", projectRoot])
        runGit(clonePath, ["fetch", "-q", "mirror"])

        const opening = openReservedBranch(clonePath)

        await expect(opening).rejects.toThrow("remotes, mirror, origin:")
        expect(await isReservedBranchWorktree(clonePath)).toBe(false)
    })
})
