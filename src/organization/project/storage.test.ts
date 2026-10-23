import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { loadProject, saveProject } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const todoApp = { description: "A to-do app for teams.\n" }

describe("saveProject", () => {
    test("writes the description in .aico/project/description.md", async () => {
        await saveProject(projectRoot, todoApp)

        const descriptionPath = join(
            projectRoot,
            ".aico",
            "project",
            "description.md",
        )
        expect(await Bun.file(descriptionPath).text()).toBe(todoApp.description)
    })
})

describe("loadProject", () => {
    test("reads back what saveProject wrote", async () => {
        await saveProject(projectRoot, todoApp)

        expect(await loadProject(projectRoot)).toEqual(todoApp)
    })

    test("names the file it misses", async () => {
        const loading = loadProject(projectRoot)

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow(".aico/project/description.md")
    })
})
