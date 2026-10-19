import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import { UserError } from "../user-error.ts"
import { readJsonFile } from "./read-json-file.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const schema = z.strictObject({ title: z.string().min(1) })
const getConfigPath = () => join(projectRoot, ".llmco", "config.json")

describe("readJsonFile", () => {
    test("returns the parsed and validated config", async () => {
        await Bun.write(getConfigPath(), '{ "title": "Developer" }')

        const config = await readJsonFile(projectRoot, getConfigPath(), schema)

        expect(config).toEqual({ title: "Developer" })
    })

    test("reports invalid JSON with the file name", async () => {
        await Bun.write(getConfigPath(), "{ title: ")
        const reading = readJsonFile(projectRoot, getConfigPath(), schema)
        const refusalMessage = "Invalid JSON in .llmco/config.json"

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("reports schema errors with the file name and the field", async () => {
        await Bun.write(getConfigPath(), '{ "title": "" }')
        const reading = readJsonFile(projectRoot, getConfigPath(), schema)
        const refusalPattern = /Invalid \.llmco\/config\.json:\n.*\n.*at title/

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow(refusalPattern)
    })
})
