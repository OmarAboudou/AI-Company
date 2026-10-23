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
        const assignment = getPositionAssignment(developer, "founder")

        expect(assignment).toEqual({
            position: developer,
            isFounderPosition: false,
            holder: { kind: "employee", employeeId: "claude" },
        })
    })

    test("has the user hold a position no employee holds", () => {
        const { employeeId, ...userDeveloper } = developer

        const assignment = getPositionAssignment(userDeveloper, "founder")

        expect(assignment.holder).toEqual(user)
    })

    test("has the user hold the founder's position", () => {
        const founderPosition = {
            id: "founder",
            title: "Founder",
            description: "",
        }

        const assignment = getPositionAssignment(founderPosition, "founder")

        expect(assignment.isFounderPosition).toBe(true)
        expect(assignment.holder).toEqual(user)
    })
})
