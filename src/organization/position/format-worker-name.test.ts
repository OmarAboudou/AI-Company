import { describe, expect, test } from "bun:test"
import { formatWorkerName } from "./format-worker-name.ts"

describe("formatWorkerName", () => {
    test("quotes an employee's id", () => {
        const julie = { kind: "employee", employeeId: "julie" } as const

        expect(formatWorkerName(julie)).toBe('"julie"')
    })

    test("calls the directors the directors", () => {
        expect(formatWorkerName({ kind: "directors" })).toBe("the directors")
    })
})
