import { describe, expect, test } from "bun:test"
import { currentWorker } from "./worker.ts"

const developer = {
    id: "developer",
    title: "Developer",
    description: "",
    defaultEmployeeId: "claude",
}
const julie = { kind: "employee", employeeId: "julie" } as const
const directors = { kind: "directors" } as const

describe("currentWorker", () => {
    test("is the default employee without a temporary assignment", () => {
        const worker = currentWorker(developer, {}, "director")

        expect(worker).toEqual({ kind: "employee", employeeId: "claude" })
    })

    test.each([julie, directors])(
        "is the temporary assignee %j",
        (assignee) => {
            const state = { temporaryAssignment: assignee }

            const worker = currentWorker(developer, state, "director")

            expect(worker).toEqual(assignee)
        },
    )

    test("is nobody for a vacant position", () => {
        const { defaultEmployeeId, ...vacant } = developer

        expect(currentWorker(vacant, {}, "director")).toBeUndefined()
    })

    test("is the directors for the director's position", () => {
        const director = { id: "director", title: "Director", description: "" }

        expect(currentWorker(director, {}, "director")).toEqual(directors)
    })
})
