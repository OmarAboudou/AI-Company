import { describe, expect, test } from "bun:test"
import { getPositionAssignment } from "../position/get-position-assignment.ts"
import { getPositionsHeldByUser } from "./get-positions-held-by-user.ts"

const assignments = [
    getPositionAssignment(
        {
            id: "dev",
            title: "Developer",
            description: "",
            employeeId: "claude",
        },
        "director",
    ),
    getPositionAssignment(
        { id: "director", title: "Director", description: "" },
        "director",
    ),
    getPositionAssignment(
        { id: "qa", title: "QA", description: "" },
        "director",
    ),
]

describe("getPositionsHeldByUser", () => {
    test("gives the positions no employee holds, the director's among them", () => {
        const positionIds = getPositionsHeldByUser(assignments).map(
            ({ position }) => position.id,
        )

        expect(positionIds).toEqual(["director", "qa"])
    })
})
