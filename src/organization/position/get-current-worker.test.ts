import { describe, expect, test } from "bun:test"
import { getCurrentWorker } from "./get-current-worker.ts"

const developer = {
    id: "developer",
    title: "Developer",
    description: "",
    defaultEmployeeId: "claude",
}
const julie = { kind: "employee", employeeId: "julie" } as const
const directors = { kind: "directors" } as const

describe("getCurrentWorker", () => {
    test("is the default employee without a temporary assignment", () => {
        const worker = getCurrentWorker(developer, {}, "director")

        expect(worker).toEqual({ kind: "employee", employeeId: "claude" })
    })

    test.each([julie, directors])(
        "is the temporary assignee %j",
        (assignee) => {
            const state = { temporaryAssignment: assignee }

            const worker = getCurrentWorker(developer, state, "director")

            expect(worker).toEqual(assignee)
        },
    )

    test("is nobody for a vacant position", () => {
        const { defaultEmployeeId, ...vacant } = developer

        expect(getCurrentWorker(vacant, {}, "director")).toBeUndefined()
    })

    test("is the directors for the director's position", () => {
        const director = { id: "director", title: "Director", description: "" }

        expect(getCurrentWorker(director, {}, "director")).toEqual(directors)
    })
})
