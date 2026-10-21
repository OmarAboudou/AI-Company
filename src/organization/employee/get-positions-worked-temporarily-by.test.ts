import { describe, expect, test } from "bun:test"
import { getPositionAssignment } from "../position/get-position-assignment.ts"
import { getPositionsWorkedTemporarilyBy } from "./get-positions-worked-temporarily-by.ts"

const julieState = {
    temporaryAssignment: { kind: "employee", employeeId: "julie" },
} as const

const directorsState = { temporaryAssignment: { kind: "directors" } } as const

describe("getPositionsWorkedTemporarilyBy", () => {
    test("gives the assignments of the positions assigned temporarily to the employee", () => {
        const julieAssignment = getPositionAssignment(
            { id: "dev", title: "Developer", description: "" },
            julieState,
            "director",
        )
        const assignments = [
            julieAssignment,
            getPositionAssignment(
                { id: "qa", title: "QA", description: "" },
                directorsState,
                "director",
            ),
            getPositionAssignment(
                {
                    id: "ux",
                    title: "UX",
                    description: "",
                    defaultEmployeeId: "julie",
                },
                {},
                "director",
            ),
        ]

        const temporaryAssignments = getPositionsWorkedTemporarilyBy(
            assignments,
            "julie",
        )

        expect(temporaryAssignments).toEqual([julieAssignment])
    })
})
