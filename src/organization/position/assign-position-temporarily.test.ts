import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import { saveEmployee } from "../employee/storage.ts"
import {
    assignPositionTemporarily,
    type TemporaryAssignee,
} from "./assign-position-temporarily.ts"
import { loadPosition, loadPositionState, savePosition } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        savePosition(projectRoot, {
            id: "dev",
            title: "Developer",
            description: "",
            defaultEmployeeId: "omar",
        }),
        savePosition(projectRoot, { id: "ux", title: "UX", description: "" }),
        ...["omar", "julie", "bob"].map((id) =>
            saveEmployee(projectRoot, { id, name: id, kind: "human" }),
        ),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const toOmar = { kind: "employee", rawEmployeeId: "omar" } as const
const toJulie = { kind: "employee", rawEmployeeId: "julie" } as const
const toBob = { kind: "employee", rawEmployeeId: "bob" } as const
const toDirectors = { kind: "directors" } as const
const julie = { kind: "employee", employeeId: "julie" } as const
const replacing = { shouldReplace: true }

function assignTemporarily(
    positionId: string,
    assignee: TemporaryAssignee,
    options?: { shouldReplace?: boolean },
) {
    return assignPositionTemporarily(projectRoot, positionId, assignee, options)
}

async function loadTemporaryAssignment(positionId: string) {
    const state = await loadPositionState(projectRoot, positionId)
    return state.temporaryAssignment
}

describe("assignPositionTemporarily", () => {
    test("assigns a position to an employee and keeps its default one", async () => {
        const outcome = await assignTemporarily("dev", toJulie)

        const position = await loadPosition(projectRoot, "dev")
        expect(await loadTemporaryAssignment("dev")).toEqual(julie)
        expect(position.defaultEmployeeId).toBe("omar")
        expect(outcome).toEqual({
            kind: "assigned",
            positionId: "dev",
            temporaryAssignment: julie,
            replacedTemporaryAssignment: undefined,
        })
    })

    test("assigns a vacant position to the directors", async () => {
        await assignTemporarily("ux", toDirectors)

        expect(await loadTemporaryAssignment("ux")).toEqual(toDirectors)
    })

    test("refuses to replace a temporary assignment unless told to", async () => {
        await assignTemporarily("dev", toJulie)

        const assigning = assignTemporarily("dev", toBob)

        await expect(assigning).rejects.toThrow(UserError)
        await expect(assigning).rejects.toThrow('temporarily to "julie".')
        await expect(assigning).rejects.toThrow("Add --replace")
        expect(await loadTemporaryAssignment("dev")).toEqual(julie)
    })

    test("replaces the temporary assignment when told to", async () => {
        await assignTemporarily("dev", toJulie)

        const outcome = await assignTemporarily("dev", toDirectors, replacing)

        expect(await loadTemporaryAssignment("dev")).toEqual(toDirectors)
        expect(outcome).toMatchObject({ replacedTemporaryAssignment: julie })
    })

    test("changes nothing for the same temporary assignment", async () => {
        await assignTemporarily("dev", toJulie)

        const outcome = await assignTemporarily("dev", toJulie)

        expect(outcome.kind).toBe("already-assigned")
        expect(await loadTemporaryAssignment("dev")).toEqual(julie)
    })

    test("changes nothing for the default employee", async () => {
        const outcome = await assignTemporarily("dev", toOmar)

        expect(outcome.kind).toBe("worked-by-default-employee")
        expect(await loadPositionState(projectRoot, "dev")).toEqual({})
    })

    test("refuses the default employee while someone else works it", async () => {
        await assignTemporarily("dev", toJulie)

        const assigning = assignTemporarily("dev", toOmar, replacing)

        await expect(assigning).rejects.toThrow(UserError)
        await expect(assigning).rejects.toThrow("unassign-temporarily dev")
        expect(await loadTemporaryAssignment("dev")).toEqual(julie)
    })

    test("refuses the director's position", async () => {
        const assigning = assignTemporarily("director", toDirectors)

        await expect(assigning).rejects.toThrow(UserError)
        await expect(assigning).rejects.toThrow("is the director's position")
        expect(await loadPositionState(projectRoot, "director")).toEqual({})
    })

    test("refuses an unknown position", async () => {
        const assigning = assignTemporarily("qa", toJulie)

        await expect(assigning).rejects.toThrow('No position "qa".')
    })

    test("refuses an unknown employee", async () => {
        const toEve = { kind: "employee", rawEmployeeId: "eve" } as const

        const assigning = assignTemporarily("dev", toEve)

        await expect(assigning).rejects.toThrow('No employee "eve".')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const assigning = assignPositionTemporarily(elsewhere, "dev", toJulie)

        await expect(assigning).rejects.toThrow("Run `llmco init` first.")
    })
})
