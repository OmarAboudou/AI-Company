import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listJsonFileIds } from "./list-json-file-ids.ts"

let folderPath: string

beforeEach(async () => {
    folderPath = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
})

describe("listJsonFileIds", () => {
    test("returns the JSON files' names sorted, without .json", async () => {
        const earlierId = "20261018-140000-000-3f9a"
        const laterId = "20261018-150000-000-b27c"
        await Promise.all(
            [laterId, earlierId].map((id) =>
                Bun.write(join(folderPath, `${id}.json`), "{}"),
            ),
        )

        expect(await listJsonFileIds(folderPath)).toEqual([earlierId, laterId])
    })

    test("leaves out the other files and the folders", async () => {
        await Promise.all([
            Bun.write(join(folderPath, "notes.md"), ""),
            mkdir(join(folderPath, "archive.json")),
        ])

        expect(await listJsonFileIds(folderPath)).toEqual([])
    })

    test("is empty when the folder does not exist", async () => {
        expect(await listJsonFileIds(join(folderPath, "nope"))).toEqual([])
    })
})
