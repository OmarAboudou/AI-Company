import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listFolderEntries } from "./list-folder-entries.ts"

let folderPath: string

beforeEach(async () => {
    folderPath = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
})

describe("listFolderEntries", () => {
    test("lists the folder's files and subfolders", async () => {
        await Bun.write(join(folderPath, "qa", "config.json"), "")
        await Bun.write(join(folderPath, "notes.md"), "")

        const entries = await listFolderEntries(folderPath)

        const entryNames = entries.map(({ name }) => name).sort()
        expect(entryNames).toEqual(["notes.md", "qa"])
    })

    test("lists nothing in a folder that doesn't exist", async () => {
        const entries = await listFolderEntries(join(folderPath, "nope"))

        expect(entries).toEqual([])
    })

    test("refuses a file", async () => {
        const filePath = join(folderPath, "notes.md")
        await Bun.write(filePath, "")

        const listing = listFolderEntries(filePath)

        await expect(listing).rejects.toThrow("ENOTDIR")
    })
})
