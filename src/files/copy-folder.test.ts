import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { copyFolder } from "./copy-folder.ts"

let folderPath: string

beforeEach(async () => {
    folderPath = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(folderPath, { recursive: true, force: true })
})

describe("copyFolder", () => {
    test("copies the folder with everything in it", async () => {
        const configPath = join("developer", "memories", "config.json")
        await Bun.write(join(folderPath, configPath), "{}")

        await copyFolder(
            join(folderPath, "developer"),
            join(folderPath, "backend-developer"),
        )

        const copiedConfigPath = join(
            folderPath,
            "backend-developer",
            "memories",
            "config.json",
        )
        expect(await Bun.file(copiedConfigPath).text()).toBe("{}")
    })

    test("never overwrites a file of the copy's folder", async () => {
        await Bun.write(join(folderPath, "developer", "config.json"), "{}")
        const existingConfigPath = join(folderPath, "qa", "config.json")
        await Bun.write(existingConfigPath, '{"title":"QA"}')

        const copying = copyFolder(
            join(folderPath, "developer"),
            join(folderPath, "qa"),
        )

        await expect(copying).rejects.toThrow()
        expect(await Bun.file(existingConfigPath).text()).toBe('{"title":"QA"}')
    })
})
