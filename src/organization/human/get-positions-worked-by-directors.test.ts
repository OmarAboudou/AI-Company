import { describe, expect, test } from "bun:test"
import { getPositionAssignment } from "../position/get-position-assignment.ts"
import { getPositionsWorkedByDirectors } from "./get-positions-worked-by-directors.ts"

const directors = { kind: "directors" } as const
const claudeWorker = { kind: "employee", employeeId: "claude" } as const

const assignments = [
    getPositionAssignment(
        {
            id: "dev",
            title: "Developer",
            description: "",
            defaultEmployeeId: "claude",
        },
        {},
        "director",
    ),
    getPositionAssignment(
        { id: "director", title: "Director", description: "" },
        {},
        "director",
    ),
    getPositionAssignment(
        { id: "qa", title: "QA", description: "", defaultEmployeeId: "claude" },
        { temporaryAssignment: directors },
        "director",
    ),
    getPositionAssignment(
        { id: "ux", title: "UX", description: "" },
        { temporaryAssignment: claudeWorker },
        "director",
    ),
]

describe("getPositionsWorkedByDirectors", () => {
    test("gives the director's position and what the directors cover", () => {
        const positionIds = getPositionsWorkedByDirectors(assignments).map(
            ({ position }) => position.id,
        )

        expect(positionIds).toEqual(["director", "qa"])
    })
})
