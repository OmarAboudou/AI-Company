import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../user-error.ts"
import { readTextFile } from "./read-text-file.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const getConfigPath = () => join(projectRoot, ".aico", "config.json")

describe("readTextFile", () => {
    test("returns the file content", async () => {
        await Bun.write(getConfigPath(), "hello")

        expect(await readTextFile(projectRoot, getConfigPath())).toBe("hello")
    })

    test("names the missing file relative to the project root", async () => {
        const reading = readTextFile(projectRoot, getConfigPath())
        const refusalMessage = "Missing file: .aico/config.json"

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow(refusalMessage)
    })
})
