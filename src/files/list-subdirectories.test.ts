import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listSubdirectories } from "./list-subdirectories.ts"

let folderPath: string

beforeEach(async () => {
    folderPath = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
})

describe("listSubdirectories", () => {
    test("returns the subdirectory names sorted, without the files", async () => {
        await Bun.write(join(folderPath, "qa", "config.json"), "")
        await Bun.write(join(folderPath, "developer", "config.json"), "")
        await Bun.write(join(folderPath, "notes.md"), "")

        expect(await listSubdirectories(folderPath)).toEqual([
            "developer",
            "qa",
        ])
    })

    test("is empty when the directory does not exist", async () => {
        expect(await listSubdirectories(join(folderPath, "nope"))).toEqual([])
    })
})
