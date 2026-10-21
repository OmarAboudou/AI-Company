import { describe, expect, test } from "bun:test"
import { getPositionAssignment } from "./get-position-assignment.ts"

const developer = {
    id: "developer",
    title: "Developer",
    description: "",
    defaultEmployeeId: "claude",
}
const julieWorker = { kind: "employee", employeeId: "julie" } as const
const directors = { kind: "directors" } as const

describe("getPositionAssignment", () => {
    test("has the default employee work a position not assigned temporarily", () => {
        const assignment = getPositionAssignment(developer, {}, "director")

        expect(assignment).toEqual({
            position: developer,
            isDirectorPosition: false,
            state: {},
            currentWorker: { kind: "employee", employeeId: "claude" },
        })
    })

    test.each([julieWorker, directors])(
        "has the temporary assignee %j work the position",
        (assignee) => {
            const state = { temporaryAssignment: assignee }

            const assignment = getPositionAssignment(
                developer,
                state,
                "director",
            )

            expect(assignment.currentWorker).toEqual(assignee)
        },
    )

    test("has nobody work a vacant position", () => {
        const { defaultEmployeeId, ...vacantDeveloper } = developer

        const assignment = getPositionAssignment(
            vacantDeveloper,
            {},
            "director",
        )

        expect(assignment.currentWorker).toBeUndefined()
    })

    test("has the directors work the director's position", () => {
        const directorPosition = {
            id: "director",
            title: "Director",
            description: "",
        }

        const assignment = getPositionAssignment(
            directorPosition,
            {},
            "director",
        )

        expect(assignment.isDirectorPosition).toBe(true)
        expect(assignment.currentWorker).toEqual(directors)
    })
})
