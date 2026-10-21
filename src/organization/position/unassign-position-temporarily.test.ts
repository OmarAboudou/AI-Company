import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import {
    loadPositionState,
    savePosition,
    savePositionState,
} from "./storage.ts"
import { unassignPositionTemporarily } from "./unassign-position-temporarily.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developer = {
    id: "dev",
    title: "Developer",
    description: "",
    defaultEmployeeId: "omar",
}
const julieWorker = { kind: "employee", employeeId: "julie" } as const
const directors = { kind: "directors" } as const

describe("unassignPositionTemporarily", () => {
    test("gives the position back to its default employee", async () => {
        await savePosition(projectRoot, developer)
        await savePositionState(projectRoot, "dev", {
            temporaryAssignment: julieWorker,
        })

        const unassignment = await unassignPositionTemporarily(
            projectRoot,
            "dev",
        )

        expect(await loadPositionState(projectRoot, "dev")).toEqual({})
        expect(unassignment.endedTemporaryAssignment).toEqual(julieWorker)
        expect(unassignment.position.defaultEmployeeId).toBe("omar")
    })

    test("leaves a vacant position vacant again", async () => {
        const { defaultEmployeeId, ...vacantDeveloper } = developer
        await savePosition(projectRoot, vacantDeveloper)
        await savePositionState(projectRoot, "dev", {
            temporaryAssignment: directors,
        })

        const unassignment = await unassignPositionTemporarily(
            projectRoot,
            "dev",
        )

        expect(await loadPositionState(projectRoot, "dev")).toEqual({})
        expect(unassignment.endedTemporaryAssignment).toEqual(directors)
        expect(unassignment.position.defaultEmployeeId).toBeUndefined()
    })

    test("changes nothing for a position not assigned temporarily", async () => {
        await savePosition(projectRoot, developer)

        const unassignment = await unassignPositionTemporarily(
            projectRoot,
            "dev",
        )

        expect(unassignment.endedTemporaryAssignment).toBeUndefined()
    })

    test("refuses an unknown position", async () => {
        const unassignment = unassignPositionTemporarily(
            projectRoot,
            "designer",
        )

        await expect(unassignment).rejects.toThrow(UserError)
        await expect(unassignment).rejects.toThrow('No position "designer".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const unassignment = unassignPositionTemporarily(
            folderWithoutCompany,
            "dev",
        )

        await expect(unassignment).rejects.toThrow("Run `llmco init` first.")
    })
})
