import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import { listSubdirectories, readConfig, readText } from "./files.ts"
import { UserError } from "./user-error.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const schema = z.strictObject({ title: z.string().min(1) })
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

describe("readConfig", () => {
    test("returns the parsed and validated config", async () => {
        await Bun.write(path(), '{ "title": "Developer" }')

        expect(await readConfig(projectRoot, path(), schema)).toEqual({
            title: "Developer",
        })
    })

    test("reports invalid JSON with the file name", async () => {
        await Bun.write(path(), "{ title: ")
        const read = readConfig(projectRoot, path(), schema)

        await expect(read).rejects.toThrow(UserError)
        await expect(read).rejects.toThrow("Invalid JSON in .llmco/config.json")
    })

    test("reports schema errors with the file name and the field", async () => {
        await Bun.write(path(), '{ "title": "" }')
        const read = readConfig(projectRoot, path(), schema)

        await expect(read).rejects.toThrow(UserError)
        await expect(read).rejects.toThrow(
            /Invalid \.llmco\/config\.json:\n.*\n.*at title/,
        )
    })
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
