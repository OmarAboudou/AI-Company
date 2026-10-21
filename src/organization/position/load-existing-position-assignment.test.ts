import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { loadExistingPositionAssignment } from "./load-existing-position-assignment.ts"
import { savePosition, savePositionState } from "./storage.ts"

let projectRoot: string

const developer = { id: "developer", title: "Developer", description: "" }
const directors = { kind: "directors" } as const

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        savePosition(projectRoot, developer),
        savePositionState(projectRoot, "developer", {
            temporaryAssignment: directors,
        }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("loadExistingPositionAssignment", () => {
    test("loads the position the id names, its state and who works it now", async () => {
        const assignment = await loadExistingPositionAssignment(
            projectRoot,
            "developer",
        )

        expect(assignment).toEqual({
            position: developer,
            isDirectorPosition: false,
            state: { temporaryAssignment: directors },
            currentWorker: directors,
        })
    })

    test("refuses an unknown position, saying how to list them", async () => {
        const loading = loadExistingPositionAssignment(projectRoot, "qa")

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow('No position "qa".')
    })
})
