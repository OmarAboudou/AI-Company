import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { loadExistingPositionAssignment } from "./load-existing-position-assignment.ts"
import { savePosition } from "./storage.ts"

let projectRoot: string

const developer = { id: "developer", title: "Developer", description: "" }

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await savePosition(projectRoot, developer)
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("loadExistingPositionAssignment", () => {
    test("loads the position the id names, with who holds it", async () => {
        const assignment = await loadExistingPositionAssignment(
            projectRoot,
            "developer",
        )

        expect(assignment).toEqual({
            position: developer,
            isFounderPosition: false,
            holder: { kind: "user" },
        })
    })

    test("refuses an unknown position, saying how to list them", async () => {
        const loading = loadExistingPositionAssignment(projectRoot, "qa")

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow('No position "qa".')
    })
})
