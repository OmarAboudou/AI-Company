import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { listPositionAssignments } from "./list-position-assignments.ts"
import { savePosition } from "./storage.ts"

let projectRoot: string

const developer = {
    id: "developer",
    title: "Developer",
    description: "",
    employeeId: "claude",
}

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await savePosition(projectRoot, developer)
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("listPositionAssignments", () => {
    test("gives each position with who holds it", async () => {
        const assignments = await listPositionAssignments(projectRoot)

        expect(assignments).toEqual([
            {
                position: developer,
                isFounderPosition: false,
                holder: { kind: "employee", employeeId: "claude" },
            },
            {
                position: {
                    id: "founder",
                    title: "Founder",
                    description: "",
                },
                isFounderPosition: true,
                holder: { kind: "user" },
            },
        ])
    })
})
