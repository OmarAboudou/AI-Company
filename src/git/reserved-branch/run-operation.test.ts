import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { saveState } from "../../files/save-state.ts"
import { UserError } from "../../user-error.ts"
import { createGitRepository } from "../create-git-repository.testing.ts"
import { runGit } from "../run-git.ts"
import { createReservedBranch } from "./create-reserved-branch.ts"
import { runOperation } from "./run-operation.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
    createGitRepository(projectRoot, {
        name: "Test User",
        email: "test@example.com",
    })
    await createReservedBranch(projectRoot)
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function getDataPath(...segments: string[]) {
    return join(projectRoot, ".aico", ...segments)
}

function runGitInData(...args: string[]) {
    return runGit(getDataPath(), args)
}

function readCommitSubjects(): string[] {
    const log = runGitInData("log", "--format=%s")
    return log === undefined || log === "" ? [] : log.split("\n")
}

function readCommittedFiles(revision: string): string[] {
    const showArgs = ["show", "--format=", "--name-only", revision]
    return (runGitInData(...showArgs) ?? "").split("\n")
}

function writeNote(fileName: string) {
    return Bun.write(getDataPath(fileName), "Hono.\n")
}

describe("runOperation", () => {
    test("commits what the operation changed, named after it", async () => {
        await runOperation(projectRoot, "aico note write", async () => {
            await writeNote("note.md")
        })

        expect(readCommitSubjects()).toEqual(["aico note write"])
        expect(readCommittedFiles("HEAD")).toEqual(["note.md"])
        expect(runGitInData("status", "--porcelain")).toBe("")
    })

    test("gives what the operation returns", async () => {
        const result = await runOperation(projectRoot, "aico note count", () =>
            Promise.resolve(3),
        )

        expect(result).toBe(3)
    })

    test("commits nothing for an operation that changes nothing", async () => {
        await runOperation(projectRoot, "aico note write", () =>
            writeNote("a.md"),
        )

        await runOperation(projectRoot, "aico note show", async () => {})

        expect(readCommitSubjects()).toEqual(["aico note write"])
    })

    test("commits apart the changes found before the operation", async () => {
        await writeNote("by-hand.md")

        await runOperation(projectRoot, "aico note write", () =>
            writeNote("note.md"),
        )

        expect(readCommitSubjects()).toEqual([
            "aico note write",
            "Changes made by hand, or left by an interrupted operation",
        ])
        expect(readCommittedFiles("HEAD~1")).toEqual(["by-hand.md"])
    })

    test("keeps the local state out of its commits", async () => {
        await runOperation(projectRoot, "aico note write", async () => {
            await writeNote("note.md")
            await saveState(projectRoot, getDataPath(".state", "x.json"), {})
        })

        expect(readCommittedFiles("HEAD")).toEqual(["note.md"])
    })

    test("commits what a failed operation changed, then fails", async () => {
        const operating = runOperation(
            projectRoot,
            "aico note write",
            async () => {
                await writeNote("note.md")
                throw new UserError("The note is too long.")
            },
        )

        await expect(operating).rejects.toThrow("The note is too long.")
        expect(readCommitSubjects()).toEqual(["aico note write"])
    })

    test("refuses a .aico/ folder that isn't the worktree of aico/data", async () => {
        const otherProjectRoot = join(projectRoot, "other")
        await mkdir(join(otherProjectRoot, ".aico"), { recursive: true })
        runGit(otherProjectRoot, ["init", "-q"])

        const operating = runOperation(
            otherProjectRoot,
            "aico note write",
            () => writeNote("note.md"),
        )

        await expect(operating).rejects.toThrow(UserError)
        await expect(operating).rejects.toThrow("move it away")
    })

    test("refuses to start an operation during another", async () => {
        const operating = runOperation(projectRoot, "aico note write", () =>
            runOperation(projectRoot, "aico note show", async () => {}),
        )

        await expect(operating).rejects.toThrow("operations never overlap")
    })

    test("commits apart the operations of processes running at once", async () => {
        const scriptPath = join(
            import.meta.dir,
            "run-operation-in-process.testing.ts",
        )
        const operationNames = ["first", "second", "third", "fourth"]

        const exitCodes = await Promise.all(
            operationNames.map(
                (operationName) =>
                    Bun.spawn([
                        process.execPath,
                        scriptPath,
                        projectRoot,
                        operationName,
                    ]).exited,
            ),
        )

        const subjects = readCommitSubjects()
        expect(exitCodes).toEqual([0, 0, 0, 0])
        expect(subjects.toSorted()).toEqual(operationNames.toSorted())
        for (const [index, subject] of subjects.entries()) {
            const files = readCommittedFiles(`HEAD~${index}`)
            expect(files).toEqual([`${subject}-1.md`, `${subject}-2.md`])
        }
    })
})
