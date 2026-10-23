import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { loadProject } from "./storage.ts"
import { updateProject } from "./update-project.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("updateProject", () => {
    test("replaces the project's description", async () => {
        const changes = { description: "A to-do app for teams." }

        const updatedProject = await updateProject(projectRoot, changes)

        expect(updatedProject).toEqual(changes)
        expect(await loadProject(projectRoot)).toEqual(changes)
    })

    test("keeps the description when given none", async () => {
        const description = "A to-do app for teams."
        await updateProject(projectRoot, { description })

        const updatedProject = await updateProject(projectRoot, {})

        expect(updatedProject).toEqual({ description })
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const updating = updateProject(folderWithoutCompany, {
            description: "A to-do app.",
        })

        await expect(updating).rejects.toThrow("Run `aico init` first.")
    })
})
