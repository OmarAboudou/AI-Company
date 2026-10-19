import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../user-error.ts"
import { readText } from "./read-text-file.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const path = () => join(projectRoot, ".llmco", "config.json")

describe("readText", () => {
    test("returns the file content", async () => {
        await Bun.write(path(), "hello")

        expect(await readText(projectRoot, path())).toBe("hello")
    })

    test("names the missing file relative to the project root", async () => {
        const read = readText(projectRoot, path())

        await expect(read).rejects.toThrow(UserError)
        await expect(read).rejects.toThrow("Missing file: .llmco/config.json")
    })
})
