import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { saveNewJsonFile } from "./save-new-json-file.ts"

let folderPath: string

beforeEach(async () => {
    folderPath = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
})

describe("saveNewJsonFile", () => {
    test("writes the content as indented JSON, creating its folder", async () => {
        const path = join(folderPath, "journal", "event.json")

        await saveNewJsonFile(path, { type: "message-sent" })

        const text = await Bun.file(path).text()
        expect(text).toBe('{\n    "type": "message-sent"\n}\n')
    })

    test("refuses a file that exists, and leaves it as it was", async () => {
        const path = join(folderPath, "event.json")
        await saveNewJsonFile(path, { type: "message-sent" })

        const overwriting = saveNewJsonFile(path, { type: "task-created" })

        await expect(overwriting).rejects.toThrow("EEXIST")
        expect(await Bun.file(path).json()).toEqual({ type: "message-sent" })
    })
})
