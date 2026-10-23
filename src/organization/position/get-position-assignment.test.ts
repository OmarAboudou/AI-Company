import { describe, expect, test } from "bun:test"
import { getPositionAssignment } from "./get-position-assignment.ts"

const developer = {
    id: "developer",
    title: "Developer",
    description: "",
    employeeId: "claude",
}
const user = { kind: "user" } as const

describe("getPositionAssignment", () => {
    test("has the position's employee hold it", () => {
        const assignment = getPositionAssignment(developer, "director")

        expect(assignment).toEqual({
            position: developer,
            isDirectorPosition: false,
            holder: { kind: "employee", employeeId: "claude" },
        })
    })

    test("has the user hold a position no employee holds", () => {
        const { employeeId, ...userDeveloper } = developer

        const assignment = getPositionAssignment(userDeveloper, "director")

        expect(assignment.holder).toEqual(user)
    })

    test("has the user hold the director's position", () => {
        const directorPosition = {
            id: "director",
            title: "Director",
            description: "",
        }

        const assignment = getPositionAssignment(directorPosition, "director")

        expect(assignment.isDirectorPosition).toBe(true)
        expect(assignment.holder).toEqual(user)
    })
})
