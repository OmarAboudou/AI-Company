import { describe, expect, test } from "bun:test"
import { getPositionAssignment } from "../position/get-position-assignment.ts"
import { getPositionsWorkedByDirectors } from "./get-positions-worked-by-directors.ts"

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

describe("getPositionsWorkedByDirectors", () => {
    test("gives the positions no employee holds, the director's among them", () => {
        const positionIds = getPositionsWorkedByDirectors(assignments).map(
            ({ position }) => position.id,
        )

        expect(positionIds).toEqual(["director", "qa"])
    })
})
