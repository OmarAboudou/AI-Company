import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createTemporaryCompany } from "../../company/create-temporary-company.ts"
import { UserError } from "../../user-error.ts"
import {
    loadPosition,
    loadPositionState,
    savePosition,
    savePositionState,
} from "../position/storage.ts"
import { deleteEmployee } from "./delete-employee.ts"
import { hasEmployee, saveEmployee } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveEmployee(projectRoot, { id: "omar", name: "Omar", kind: "human" }),
        savePosition(projectRoot, { id: "dev", title: "Dev", description: "" }),
        savePosition(projectRoot, { id: "qa", title: "QA", description: "" }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const forcing = { shouldForce: true }
const omarWorker = { kind: "employee", employeeId: "omar" } as const

async function assignDefaultEmployee(positionId: string, employeeId: string) {
    const position = await loadPosition(projectRoot, positionId)
    await savePosition(projectRoot, {
        ...position,
        defaultEmployeeId: employeeId,
    })
}

describe("deleteEmployee", () => {
    test("deletes an employee who works no position", async () => {
        const deletion = await deleteEmployee(projectRoot, "omar")

        expect(await hasEmployee(projectRoot, "omar")).toBe(false)
        expect(deletion.vacatedPositionIds).toEqual([])
    })

    test("refuses an employee who fills positions, naming them", async () => {
        await assignDefaultEmployee("dev", "omar")
        await assignDefaultEmployee("qa", "omar")

        const deletion = deleteEmployee(projectRoot, "omar")

        await expect(deletion).rejects.toThrow(UserError)
        await expect(deletion).rejects.toThrow("default employee of dev, qa")
        await expect(deletion).rejects.toThrow("Add --force")
        expect(await hasEmployee(projectRoot, "omar")).toBe(true)
    })

    test("leaves the positions it fills vacant when forced", async () => {
        await assignDefaultEmployee("dev", "omar")

        const deletion = await deleteEmployee(projectRoot, "omar", forcing)

        const position = await loadPosition(projectRoot, "dev")
        expect(position.defaultEmployeeId).toBeUndefined()
        expect(deletion.vacatedPositionIds).toEqual(["dev"])
    })

    test("refuses an employee assigned temporarily", async () => {
        const state = { temporaryAssignment: omarWorker }
        await savePositionState(projectRoot, "qa", state)
        const refusalMessage =
            'Employee "omar" is assigned temporarily to qa. Add --force to delete it anyway and end these temporary assignments.'

        const deletion = deleteEmployee(projectRoot, "omar")

        await expect(deletion).rejects.toThrow(refusalMessage)
        expect(await loadPositionState(projectRoot, "qa")).toEqual(state)
    })

    test("ends its temporary assignments when forced", async () => {
        await savePositionState(projectRoot, "qa", {
            temporaryAssignment: omarWorker,
        })

        const deletion = await deleteEmployee(projectRoot, "omar", forcing)

        expect(await loadPositionState(projectRoot, "qa")).toEqual({})
        expect(deletion.endedTemporaryPositionIds).toEqual(["qa"])
    })

    test("refuses an unknown employee", async () => {
        const deletion = deleteEmployee(projectRoot, "claude")

        await expect(deletion).rejects.toThrow('No employee "claude".')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const deletion = deleteEmployee(elsewhere, "omar")

        await expect(deletion).rejects.toThrow("Run `llmco init` first.")
    })
})
