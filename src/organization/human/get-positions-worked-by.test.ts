import { describe, expect, test } from "bun:test"
import { getPositionAssignment } from "../position/get-position-assignment.ts"
import { getPositionsWorkedBy } from "./get-positions-worked-by.ts"
import type { CurrentHuman } from "./read-current-human.ts"

const directors = { kind: "directors" } as const
const julieWorker = { kind: "employee", employeeId: "julie" } as const

const assignments = [
    getPositionAssignment(
        {
            id: "dev",
            title: "Developer",
            description: "",
            defaultEmployeeId: "julie",
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
        { id: "qa", title: "QA", description: "", defaultEmployeeId: "julie" },
        { temporaryAssignment: directors },
        "director",
    ),
    getPositionAssignment(
        { id: "ux", title: "UX", description: "" },
        { temporaryAssignment: julieWorker },
        "director",
    ),
]

const julie: CurrentHuman = {
    kind: "employee",
    employee: { id: "julie", name: "Julie", kind: "human" },
}

function getIdsWorkedBy(human: CurrentHuman): string[] {
    return getPositionsWorkedBy(assignments, human).map(
        ({ position }) => position.id,
    )
}

describe("getPositionsWorkedBy", () => {
    test("gives what an employee works by default or temporarily", () => {
        expect(getIdsWorkedBy(julie)).toEqual(["dev", "ux"])
    })

    test("gives the director's position and what the directors cover", () => {
        expect(getIdsWorkedBy({ kind: "director" })).toEqual(["director", "qa"])
    })
})
