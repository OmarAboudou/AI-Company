import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { loadPosition, savePosition } from "./storage.ts"
import { unassignPosition } from "./unassign-position.ts"

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
    description: "",
    employeeId: "omar",
}

describe("unassignPosition", () => {
    test("gives the position back to the directors", async () => {
        await savePosition(projectRoot, developer)

        const unassignment = await unassignPosition(projectRoot, "developer")

        const position = await loadPosition(projectRoot, "developer")
        expect(position.employeeId).toBeUndefined()
        expect(unassignment.previousEmployeeId).toBe("omar")
    })

    test("changes nothing for a position the directors hold", async () => {
        const { employeeId, ...directorsDeveloper } = developer
        await savePosition(projectRoot, directorsDeveloper)

        const unassignment = await unassignPosition(projectRoot, "developer")

        const savedPosition = await loadPosition(projectRoot, "developer")

        expect(savedPosition).toEqual(directorsDeveloper)
        expect(unassignment.previousEmployeeId).toBeUndefined()
    })

    test("refuses an unknown position", async () => {
        const unassigning = unassignPosition(projectRoot, "designer")

        await expect(unassigning).rejects.toThrow(UserError)
        await expect(unassigning).rejects.toThrow('No position "designer".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const unassigning = unassignPosition(folderWithoutCompany, "developer")

        await expect(unassigning).rejects.toThrow("Run `aico init` first.")
    })
})
