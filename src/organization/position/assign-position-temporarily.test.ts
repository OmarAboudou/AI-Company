import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
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

const omarAssignee = { kind: "employee", rawEmployeeId: "omar" } as const
const julieAssignee = { kind: "employee", rawEmployeeId: "julie" } as const
const bobAssignee = { kind: "employee", rawEmployeeId: "bob" } as const
const directorsAssignee = { kind: "directors" } as const
const julieWorker = { kind: "employee", employeeId: "julie" } as const
const replaceOptions = { shouldReplace: true }

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
        const assignment = await assignTemporarily("dev", julieAssignee)

        const position = await loadPosition(projectRoot, "dev")
        expect(await loadTemporaryAssignment("dev")).toEqual(julieWorker)
        expect(position.defaultEmployeeId).toBe("omar")
        expect(assignment).toEqual({
            kind: "assigned",
            positionId: "dev",
            temporaryAssignment: julieWorker,
            replacedTemporaryAssignment: undefined,
        })
    })

    test("assigns a vacant position to the directors", async () => {
        await assignTemporarily("ux", directorsAssignee)

        expect(await loadTemporaryAssignment("ux")).toEqual(directorsAssignee)
    })

    test("refuses to replace a temporary assignment unless told to", async () => {
        await assignTemporarily("dev", julieAssignee)

        const assigning = assignTemporarily("dev", bobAssignee)

        await expect(assigning).rejects.toThrow(UserError)
        await expect(assigning).rejects.toThrow('temporarily to "julie".')
        await expect(assigning).rejects.toThrow("Add --replace")
        expect(await loadTemporaryAssignment("dev")).toEqual(julieWorker)
    })

    test("replaces the temporary assignment when told to", async () => {
        await assignTemporarily("dev", julieAssignee)

        const assignment = await assignTemporarily(
            "dev",
            directorsAssignee,
            replaceOptions,
        )

        expect(await loadTemporaryAssignment("dev")).toEqual(directorsAssignee)
        expect(assignment).toMatchObject({
            replacedTemporaryAssignment: julieWorker,
        })
    })

    test("changes nothing for the same temporary assignment", async () => {
        await assignTemporarily("dev", julieAssignee)

        const assignment = await assignTemporarily("dev", julieAssignee)

        expect(assignment.kind).toBe("already-assigned")
        expect(await loadTemporaryAssignment("dev")).toEqual(julieWorker)
    })

    test("changes nothing for the default employee", async () => {
        const assignment = await assignTemporarily("dev", omarAssignee)

        expect(assignment.kind).toBe("worked-by-default-employee")
        expect(await loadPositionState(projectRoot, "dev")).toEqual({})
    })

    test("refuses the default employee while someone else works it", async () => {
        await assignTemporarily("dev", julieAssignee)

        const assigning = assignTemporarily("dev", omarAssignee, replaceOptions)

        await expect(assigning).rejects.toThrow(UserError)
        await expect(assigning).rejects.toThrow("unassign-temporarily dev")
        expect(await loadTemporaryAssignment("dev")).toEqual(julieWorker)
    })

    test("refuses the director's position", async () => {
        const assigning = assignTemporarily("director", directorsAssignee)

        await expect(assigning).rejects.toThrow(UserError)
        await expect(assigning).rejects.toThrow("is the director's position")
        expect(await loadPositionState(projectRoot, "director")).toEqual({})
    })

    test("refuses an unknown position", async () => {
        const assigning = assignTemporarily("qa", julieAssignee)

        await expect(assigning).rejects.toThrow('No position "qa".')
    })

    test("refuses an unknown employee", async () => {
        const eveAssignee = { kind: "employee", rawEmployeeId: "eve" } as const

        const assigning = assignTemporarily("dev", eveAssignee)

        await expect(assigning).rejects.toThrow('No employee "eve".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const assigning = assignPositionTemporarily(
            folderWithoutCompany,
            "dev",
            julieAssignee,
        )

        await expect(assigning).rejects.toThrow("Run `llmco init` first.")
    })
})
