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
        "founder",
    ),
    getPositionAssignment(
        { id: "founder", title: "Founder", description: "" },
        "founder",
    ),
    getPositionAssignment(
        { id: "qa", title: "QA", description: "" },
        "founder",
    ),
]

describe("getPositionsHeldByUser", () => {
    test("gives the positions no employee holds, the founder's among them", () => {
        const positionIds = getPositionsHeldByUser(assignments).map(
            ({ position }) => position.id,
        )

        expect(positionIds).toEqual(["founder", "qa"])
    })
})
