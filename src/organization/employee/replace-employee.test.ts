import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import {
    loadPosition,
    loadPositionState,
    savePosition,
    savePositionState,
} from "../position/storage.ts"
import { replaceEmployee } from "./replace-employee.ts"
import { hasEmployee, saveEmployee } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        ...["omar", "alice", "bob"].map((id) =>
            saveEmployee(projectRoot, { id, name: id, kind: "human" }),
        ),
        savePosition(projectRoot, createPosition("dev", "omar")),
        savePosition(projectRoot, createPosition("qa", "omar")),
        savePosition(projectRoot, createPosition("ux", "alice")),
        savePosition(projectRoot, createPosition("support", undefined)),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function createPosition(id: string, defaultEmployeeId: string | undefined) {
    return { id, title: id, description: "", defaultEmployeeId }
}

function assignTemporarily(positionId: string, employeeId: string) {
    return savePositionState(projectRoot, positionId, {
        temporaryAssignment: { kind: "employee", employeeId },
    })
}

async function loadDefaultEmployeeId(positionId: string) {
    const position = await loadPosition(projectRoot, positionId)
    return position.defaultEmployeeId
}

async function loadTemporaryAssignment(positionId: string) {
    const state = await loadPositionState(projectRoot, positionId)
    return state.temporaryAssignment
}

const handingOver = { shouldHandOverTemporaryAssignments: true }

function replaceOmarByAlice(options?: typeof handingOver) {
    return replaceEmployee(projectRoot, "omar", "alice", options)
}

describe("replaceEmployee", () => {
    test("gives the replacement every position the employee fills", async () => {
        const replacement = await replaceOmarByAlice()

        expect(await loadDefaultEmployeeId("dev")).toBe("alice")
        expect(await loadDefaultEmployeeId("qa")).toBe("alice")
        expect(replacement.filledPositionIds).toEqual(["dev", "qa"])
    })

    test("keeps both employees and the replacement's own positions", async () => {
        await replaceOmarByAlice()

        expect(await hasEmployee(projectRoot, "omar")).toBe(true)
        expect(await loadDefaultEmployeeId("ux")).toBe("alice")
    })

    test("changes nothing for an employee who fills no position", async () => {
        const replacement = await replaceEmployee(projectRoot, "bob", "alice")

        expect(replacement.filledPositionIds).toEqual([])
        expect(replacement.endedTemporaryPositionIds).toEqual([])
    })

    test("keeps the employee's temporary assignments", async () => {
        await assignTemporarily("support", "omar")

        const replacement = await replaceOmarByAlice()

        const assignment = await loadTemporaryAssignment("support")
        expect(assignment).toEqual({ kind: "employee", employeeId: "omar" })
        expect(replacement.keptTemporaryPositionIds).toEqual(["support"])
    })

    test("ends the replacement's temporary assignment of a position it now fills", async () => {
        await assignTemporarily("dev", "alice")

        const replacement = await replaceOmarByAlice()

        expect(await loadTemporaryAssignment("dev")).toBeUndefined()
        expect(replacement.endedTemporaryPositionIds).toEqual(["dev"])
    })

    test("hands over the employee's temporary assignments when told to", async () => {
        await assignTemporarily("support", "omar")

        const replacement = await replaceOmarByAlice(handingOver)

        const assignment = await loadTemporaryAssignment("support")
        expect(assignment).toEqual({ kind: "employee", employeeId: "alice" })
        expect(replacement.handedOverPositionIds).toEqual(["support"])
        expect(replacement.keptTemporaryPositionIds).toEqual([])
    })

    test("ends a handed over temporary assignment where the replacement is the default employee", async () => {
        await assignTemporarily("ux", "omar")

        const replacement = await replaceOmarByAlice(handingOver)

        expect(await loadTemporaryAssignment("ux")).toBeUndefined()
        expect(replacement.endedTemporaryPositionIds).toEqual(["ux"])
    })

    test("refuses an employee replacing itself", async () => {
        const replacing = replaceEmployee(projectRoot, "omar", "omar")

        await expect(replacing).rejects.toThrow(UserError)
        await expect(replacing).rejects.toThrow("can't replace itself")
    })

    test("refuses an unknown replacement, changing nothing", async () => {
        const replacing = replaceEmployee(projectRoot, "omar", "eve")

        await expect(replacing).rejects.toThrow('No employee "eve".')
        expect(await loadDefaultEmployeeId("dev")).toBe("omar")
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const replacing = replaceEmployee(elsewhere, "omar", "alice")

        await expect(replacing).rejects.toThrow("Run `llmco init` first.")
    })
})
