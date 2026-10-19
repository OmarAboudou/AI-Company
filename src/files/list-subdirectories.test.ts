import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listSubdirectories } from "./list-subdirectories.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("listSubdirectories", () => {
    test("returns the subdirectory names sorted, without the files", async () => {
        await Bun.write(join(projectRoot, "qa", "config.json"), "")
        await Bun.write(join(projectRoot, "developer", "config.json"), "")
        await Bun.write(join(projectRoot, "notes.md"), "")

        expect(await listSubdirectories(projectRoot)).toEqual([
            "developer",
            "qa",
        ])
    })

    test("is empty when the directory does not exist", async () => {
        expect(await listSubdirectories(join(projectRoot, "nope"))).toEqual([])
    })
})
