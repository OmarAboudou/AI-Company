import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../company/create-temporary-company.ts"
import { UserError } from "../../user-error.ts"
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
const julie = { kind: "employee", employeeId: "julie" } as const
const directors = { kind: "directors" } as const

describe("unassignPositionTemporarily", () => {
    test("gives the position back to its default employee", async () => {
        await savePosition(projectRoot, developer)
        await savePositionState(projectRoot, "dev", {
            temporaryAssignment: julie,
        })

        const ending = await unassignPositionTemporarily(projectRoot, "dev")

        expect(await loadPositionState(projectRoot, "dev")).toEqual({})
        expect(ending.endedTemporaryAssignment).toEqual(julie)
        expect(ending.position.defaultEmployeeId).toBe("omar")
    })

    test("leaves a vacant position vacant again", async () => {
        const { defaultEmployeeId, ...vacant } = developer
        await savePosition(projectRoot, vacant)
        await savePositionState(projectRoot, "dev", {
            temporaryAssignment: directors,
        })

        const ending = await unassignPositionTemporarily(projectRoot, "dev")

        expect(await loadPositionState(projectRoot, "dev")).toEqual({})
        expect(ending.endedTemporaryAssignment).toEqual(directors)
        expect(ending.position.defaultEmployeeId).toBeUndefined()
    })

    test("changes nothing for a position not assigned temporarily", async () => {
        await savePosition(projectRoot, developer)

        const ending = await unassignPositionTemporarily(projectRoot, "dev")

        expect(ending.endedTemporaryAssignment).toBeUndefined()
    })

    test("refuses an unknown position", async () => {
        const ending = unassignPositionTemporarily(projectRoot, "designer")

        await expect(ending).rejects.toThrow(UserError)
        await expect(ending).rejects.toThrow('No position "designer".')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const ending = unassignPositionTemporarily(elsewhere, "dev")

        await expect(ending).rejects.toThrow("Run `llmco init` first.")
    })
})
