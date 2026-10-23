import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createGitRepository } from "../../git/create-git-repository.testing.ts"
import { createReservedBranch } from "../../git/reserved-branch/create-reserved-branch.ts"
import { isReservedBranchWorktree } from "../../git/reserved-branch/is-reserved-branch-worktree.ts"
import { runGit } from "../../git/run-git.ts"
import { UserError } from "../../user-error.ts"
import { loadPosition } from "../position/storage.ts"
import { loadProject } from "../project/storage.ts"
import { createClonedCompany } from "./create-cloned-company.testing.ts"
import { createCompany } from "./create-company.ts"
import { loadCompany } from "./storage.ts"

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

const acme = { name: "Acme", description: "We build things." }

describe("createCompany", () => {
    test("saves the company, naming its director's position", async () => {
        const createdCompany = await createCompany(projectRoot, acme)

        const company = await loadCompany(projectRoot)
        expect(company).toEqual({
            name: "Acme",
            directorPositionId: "director",
        })
        expect(createdCompany).toEqual(company)
    })

    test("describes the project the company carries out", async () => {
        await createCompany(projectRoot, acme)

        const project = await loadProject(projectRoot)
        expect(project).toEqual({ description: "We build things." })
    })

    test("creates the director's position, held by no employee", async () => {
        const before = Date.now()
        await createCompany(projectRoot, acme)
        const after = Date.now()

        const position = await loadPosition(projectRoot, "director")
        const createdTime = Date.parse(position.createdAt ?? "")
        expect(position).toMatchObject({ title: "Director", description: "" })
        expect(position.defaultEmployeeId).toBeUndefined()
        expect(createdTime).toBeGreaterThanOrEqual(before)
        expect(createdTime).toBeLessThanOrEqual(after)
    })

    test("keeps the company in .aico/, the worktree of branch aico/data", async () => {
        const createdCompany = await createCompany(projectRoot, acme)

        expect(await isReservedBranchWorktree(projectRoot)).toBe(true)
        expect(await loadCompany(projectRoot)).toEqual(createdCompany)
        expect(runGit(projectRoot, ["status", "--porcelain"])).toBe("")
    })

    test("commits the company on its branch, as aico init", async () => {
        await createCompany(projectRoot, acme)

        const aicoFolderPath = join(projectRoot, ".aico")
        const log = runGit(aicoFolderPath, ["log", "--format=%s"])
        expect(log).toBe("aico init")
        expect(runGit(aicoFolderPath, ["status", "--porcelain"])).toBe("")
    })

    test("runs again once interrupted, the branch already created", async () => {
        await createReservedBranch(projectRoot)

        await createCompany(projectRoot, acme)

        expect((await loadCompany(projectRoot)).name).toBe("Acme")
    })

    test("refuses to overwrite an existing company", async () => {
        await createCompany(projectRoot, acme)

        const creation = createCompany(projectRoot, { ...acme, name: "Other" })

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow("A company already exists")
        expect((await loadCompany(projectRoot)).name).toBe("Acme")
    })

    test("refuses the company of a clone, which its branch aico/data holds", async () => {
        const { parentFolderPath, clonePath } = await createClonedCompany()

        try {
            const creation = createCompany(clonePath, {
                ...acme,
                name: "Other",
            })

            await expect(creation).rejects.toThrow("A company already exists")
            expect((await loadCompany(clonePath)).name).toBe("Acme")
        } finally {
            await rm(parentFolderPath, { recursive: true, force: true })
        }
    })

    test("refuses a blank name, before creating the branch", async () => {
        const creation = createCompany(projectRoot, { ...acme, name: " " })

        await expect(creation).rejects.toThrow(UserError)
        expect(await isReservedBranchWorktree(projectRoot)).toBe(false)
    })

    test("refuses a directory outside any git repository", async () => {
        const folderOutsideGit = await mkdtemp(join(tmpdir(), "aico-"))

        const creation = createCompany(folderOutsideGit, acme)

        await expect(creation).rejects.toThrow("Run `git init` first.")
        await rm(folderOutsideGit, { recursive: true, force: true })
    })
})
