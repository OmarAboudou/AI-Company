import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { loadPosition, savePosition } from "./storage.ts"
import { updatePosition } from "./update-position.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developer = {
    id: "developer",
    title: "Developer",
    description: "You build the API.",
}

describe("updatePosition", () => {
    test("changes the title and keeps the description", async () => {
        await savePosition(projectRoot, developer)

        await updatePosition(projectRoot, "developer", { title: "Lead" })

        const position = await loadPosition(projectRoot, "developer")
        expect(position).toEqual({ ...developer, title: "Lead" })
    })

    test("changes the description and keeps the title", async () => {
        await savePosition(projectRoot, developer)
        const changes = { description: "You review the code." }

        await updatePosition(projectRoot, "developer", changes)

        const position = await loadPosition(projectRoot, "developer")
        expect(position).toEqual({ ...developer, ...changes })
    })

    test("returns the position it saved", async () => {
        await savePosition(projectRoot, developer)
        const changes = { title: "Lead" }

        const updatedPosition = await updatePosition(
            projectRoot,
            "developer",
            changes,
        )

        const savedPosition = await loadPosition(projectRoot, "developer")

        expect(updatedPosition).toEqual(savedPosition)
    })

    test("keeps the default employee and the id history", async () => {
        const renamedDeveloper = {
            ...developer,
            defaultEmployeeId: "omar",
            createdAt: "2026-10-18T14:00:00.000Z",
            formerIds: [{ id: "dev", until: "2026-10-19T09:00:00.000Z" }],
        }
        await savePosition(projectRoot, renamedDeveloper)

        await updatePosition(projectRoot, "developer", { title: "Lead" })

        const position = await loadPosition(projectRoot, "developer")
        expect(position).toEqual({ ...renamedDeveloper, title: "Lead" })
    })

    test("refuses a blank title", async () => {
        await savePosition(projectRoot, developer)

        const updating = updatePosition(projectRoot, "developer", {
            title: " ",
        })

        await expect(updating).rejects.toThrow(UserError)
        const position = await loadPosition(projectRoot, "developer")
        expect(position.title).toBe("Developer")
    })

    test("refuses an unknown position", async () => {
        const updating = updatePosition(projectRoot, "qa-tester", {
            title: "QA",
        })

        await expect(updating).rejects.toThrow('No position "qa-tester".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const updating = updatePosition(folderWithoutCompany, "developer", {
            title: "QA",
        })

        await expect(updating).rejects.toThrow("Run `aico init` first.")
    })
})
