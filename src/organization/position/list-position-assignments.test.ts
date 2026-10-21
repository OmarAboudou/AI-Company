import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import { listPositionAssignments } from "./list-position-assignments.ts"
import { savePosition, savePositionState } from "./storage.ts"

let projectRoot: string

const developer = {
    id: "developer",
    title: "Developer",
    description: "",
    defaultEmployeeId: "claude",
}
const julieWorker = { kind: "employee", employeeId: "julie" } as const

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        savePosition(projectRoot, developer),
        savePositionState(projectRoot, "developer", {
            temporaryAssignment: julieWorker,
        }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("listPositionAssignments", () => {
    test("gives each position with its state and who works it now", async () => {
        const assignments = await listPositionAssignments(projectRoot)

        expect(assignments).toEqual([
            {
                position: developer,
                isDirectorPosition: false,
                state: { temporaryAssignment: julieWorker },
                currentWorker: julieWorker,
            },
            {
                position: {
                    id: "director",
                    title: "Director",
                    description: "",
                },
                isDirectorPosition: true,
                state: {},
                currentWorker: { kind: "directors" },
            },
        ])
    })
})
