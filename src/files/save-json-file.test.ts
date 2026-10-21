import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { saveJsonFile } from "./save-json-file.ts"

let folderPath: string

beforeEach(async () => {
    folderPath = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
})

describe("saveJsonFile", () => {
    test("writes the content as indented JSON, creating its folder", async () => {
        const path = join(folderPath, "company", "config.json")

        await saveJsonFile(path, { name: "Acme" })

        const text = await Bun.file(path).text()
        expect(text).toBe('{\n    "name": "Acme"\n}\n')
    })

    test("replaces a file that exists", async () => {
        const path = join(folderPath, "config.json")
        await saveJsonFile(path, { name: "Acme" })

        await saveJsonFile(path, { name: "Globex" })

        expect(await Bun.file(path).json()).toEqual({ name: "Globex" })
    })
})
