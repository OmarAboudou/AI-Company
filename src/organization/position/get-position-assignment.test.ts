import { describe, expect, test } from "bun:test"
import { getPositionAssignment } from "./get-position-assignment.ts"

const developer = {
    id: "developer",
    title: "Developer",
    description: "",
    employeeId: "claude",
}
const directors = { kind: "directors" } as const

describe("getPositionAssignment", () => {
    test("has the position's employee hold it", () => {
        const assignment = getPositionAssignment(developer, "director")

        expect(assignment).toEqual({
            position: developer,
            isDirectorPosition: false,
            holder: { kind: "employee", employeeId: "claude" },
        })
    })

    test("has the directors hold a position no employee holds", () => {
        const { employeeId, ...directorsDeveloper } = developer

        const assignment = getPositionAssignment(directorsDeveloper, "director")

        expect(assignment.holder).toEqual(directors)
    })

    test("has the directors hold the director's position", () => {
        const directorPosition = {
            id: "director",
            title: "Director",
            description: "",
        }

        const assignment = getPositionAssignment(directorPosition, "director")

        expect(assignment.isDirectorPosition).toBe(true)
        expect(assignment.holder).toEqual(directors)
    })
})
