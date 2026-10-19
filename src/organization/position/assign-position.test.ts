import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import { saveEmployee } from "../employee/storage.ts"
import { assignPosition } from "./assign-position.ts"
import {
    loadPosition,
    loadPositionState,
    savePosition,
    savePositionState,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        savePosition(projectRoot, { id: "dev", title: "Dev", description: "" }),
        savePosition(projectRoot, { id: "qa", title: "QA", description: "" }),
        ...["omar", "julie", "bob"].map((id) =>
            saveEmployee(projectRoot, { id, name: id, kind: "human" }),
        ),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const julieWorker = { kind: "employee", employeeId: "julie" } as const

async function loadDefaultEmployeeId(positionId: string) {
    const position = await loadPosition(projectRoot, positionId)
    return position.defaultEmployeeId
}

describe("assignPosition", () => {
    test("sets the default employee of a vacant position", async () => {
        const assignment = await assignPosition(projectRoot, "dev", "omar")

        expect(await loadDefaultEmployeeId("dev")).toBe("omar")
        expect(assignment.previousEmployeeId).toBeUndefined()
    })

    test("refuses to replace a default employee unless told to", async () => {
        await assignPosition(projectRoot, "dev", "bob")

        const assignment = assignPosition(projectRoot, "dev", "omar")

        await expect(assignment).rejects.toThrow(UserError)
        await expect(assignment).rejects.toThrow('already has "bob"')
        await expect(assignment).rejects.toThrow("Add --replace")
        expect(await loadDefaultEmployeeId("dev")).toBe("bob")
    })

    test("replaces the default employee when told to", async () => {
        await assignPosition(projectRoot, "dev", "bob")

        const assignment = await assignPosition(projectRoot, "dev", "omar", {
            shouldReplace: true,
        })

        expect(await loadDefaultEmployeeId("dev")).toBe("omar")
        expect(assignment.previousEmployeeId).toBe("bob")
    })

    test("changes nothing for the current default employee", async () => {
        await assignPosition(projectRoot, "dev", "omar")

        const assignment = await assignPosition(projectRoot, "dev", "omar")

        expect(await loadDefaultEmployeeId("dev")).toBe("omar")
        expect(assignment.previousEmployeeId).toBe("omar")
    })

    test("lets an employee be the default employee of several positions", async () => {
        await assignPosition(projectRoot, "dev", "omar")
        await assignPosition(projectRoot, "qa", "omar")

        expect(await loadDefaultEmployeeId("dev")).toBe("omar")
        expect(await loadDefaultEmployeeId("qa")).toBe("omar")
    })

    test("refuses the director's position", async () => {
        const assignment = assignPosition(projectRoot, "director", "omar")

        await expect(assignment).rejects.toThrow(UserError)
        await expect(assignment).rejects.toThrow("is the director's position")
        expect(await loadDefaultEmployeeId("director")).toBeUndefined()
    })

    test("ends the temporary assignment of the employee it assigns", async () => {
        const state = { temporaryAssignment: julieWorker }
        await savePositionState(projectRoot, "dev", state)
        const before = await loadPositionState(projectRoot, "dev")

        const assignment = await assignPosition(projectRoot, "dev", "julie")

        expect(before).toEqual(state)
        expect(await loadPositionState(projectRoot, "dev")).toEqual({})
        expect(assignment.hasEndedTemporaryAssignment).toBe(true)
        expect(assignment.temporaryAssignment).toBeUndefined()
    })

    test("keeps the temporary assignment of another employee", async () => {
        const state = { temporaryAssignment: julieWorker }
        await savePositionState(projectRoot, "dev", state)

        const assignment = await assignPosition(projectRoot, "dev", "bob")

        expect(await loadPositionState(projectRoot, "dev")).toEqual(state)
        expect(assignment.hasEndedTemporaryAssignment).toBe(false)
        expect(assignment.temporaryAssignment).toEqual(julieWorker)
    })

    test("refuses an unknown position", async () => {
        const assignment = assignPosition(projectRoot, "designer", "omar")

        await expect(assignment).rejects.toThrow('No position "designer".')
    })

    test("refuses an unknown employee", async () => {
        const assignment = assignPosition(projectRoot, "dev", "eve")

        await expect(assignment).rejects.toThrow('No employee "eve".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const assignment = assignPosition(folderWithoutCompany, "dev", "omar")

        await expect(assignment).rejects.toThrow("Run `llmco init` first.")
    })
})
