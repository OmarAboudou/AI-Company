import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runGitOrThrow } from "./run-git-or-throw.ts"

let folderPath: string

beforeEach(async () => {
    folderPath = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
})

describe("runGitOrThrow", () => {
    test("gives what git printed", () => {
        runGitOrThrow(folderPath, ["init", "-q"])

        const revParseArgs = ["rev-parse", "--is-inside-work-tree"]
        const isInside = runGitOrThrow(folderPath, revParseArgs)

        expect(isInside).toBe("true")
    })

    test("throws what git said when it fails", () => {
        const showing = () => runGitOrThrow(folderPath, ["show", "HEAD"])

        expect(showing).toThrow("git show HEAD failed")
    })
})
