import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../company/create-temporary-company.ts"
import { UserError } from "../../user-error.ts"
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

        const updated = await updatePosition(projectRoot, "developer", changes)

        expect(updated).toEqual(await loadPosition(projectRoot, "developer"))
    })

    test("keeps the default employee and the id history", async () => {
        const renamed = {
            ...developer,
            defaultEmployeeId: "omar",
            createdAt: "2026-10-18T14:00:00.000Z",
            formerIds: [{ id: "dev", until: "2026-10-19T09:00:00.000Z" }],
        }
        await savePosition(projectRoot, renamed)

        await updatePosition(projectRoot, "developer", { title: "Lead" })

        const position = await loadPosition(projectRoot, "developer")
        expect(position).toEqual({ ...renamed, title: "Lead" })
    })

    test("refuses a blank title", async () => {
        await savePosition(projectRoot, developer)

        const update = updatePosition(projectRoot, "developer", { title: " " })

        await expect(update).rejects.toThrow(UserError)
        const position = await loadPosition(projectRoot, "developer")
        expect(position.title).toBe("Developer")
    })

    test("refuses an unknown position", async () => {
        const update = updatePosition(projectRoot, "qa-tester", { title: "QA" })

        await expect(update).rejects.toThrow('No position "qa-tester".')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const update = updatePosition(elsewhere, "developer", { title: "QA" })

        await expect(update).rejects.toThrow("Run `llmco init` first.")
    })
})
