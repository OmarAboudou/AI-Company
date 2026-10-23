import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import {
    loadPosition,
    loadPositionState,
    savePosition,
    savePositionState,
} from "./storage.ts"
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
    defaultEmployeeId: "omar",
}

describe("unassignPosition", () => {
    test("makes the position vacant", async () => {
        await savePosition(projectRoot, developer)

        const unassignment = await unassignPosition(projectRoot, "developer")

        const position = await loadPosition(projectRoot, "developer")
        expect(position.defaultEmployeeId).toBeUndefined()
        expect(unassignment.previousEmployeeId).toBe("omar")
    })

    test("changes nothing for a vacant position", async () => {
        const { defaultEmployeeId, ...vacantDeveloper } = developer
        await savePosition(projectRoot, vacantDeveloper)

        const unassignment = await unassignPosition(projectRoot, "developer")

        const savedPosition = await loadPosition(projectRoot, "developer")

        expect(savedPosition).toEqual(vacantDeveloper)
        expect(unassignment.previousEmployeeId).toBeUndefined()
    })

    test("keeps the temporary assignment", async () => {
        const julieWorker = { kind: "employee", employeeId: "julie" } as const
        const state = { temporaryAssignment: julieWorker }
        await savePosition(projectRoot, developer)
        await savePositionState(projectRoot, "developer", state)

        const unassignment = await unassignPosition(projectRoot, "developer")

        expect(await loadPositionState(projectRoot, "developer")).toEqual(state)
        expect(unassignment.temporaryAssignment).toEqual(julieWorker)
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
