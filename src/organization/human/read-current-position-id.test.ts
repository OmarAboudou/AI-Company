import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { readCurrentPositionId } from "./read-current-position-id.ts"

describe("readCurrentPositionId", () => {
    test("is no position when the variable is unset or empty", () => {
        const unsetId = readCurrentPositionId({})
        const emptyId = readCurrentPositionId({ AICO_CURRENT_POSITION_ID: "" })

        expect(unsetId).toBeUndefined()
        expect(emptyId).toBeUndefined()
    })

    test("is the position id the variable holds", () => {
        const currentPositionId = readCurrentPositionId({
            AICO_CURRENT_POSITION_ID: "backend-developer",
        })

        expect(currentPositionId).toBe("backend-developer")
    })

    test("refuses a value that isn't a position id", () => {
        const environment = { AICO_CURRENT_POSITION_ID: "Backend Developer" }

        const reading = () => readCurrentPositionId(environment)

        expect(reading).toThrow(UserError)
        expect(reading).toThrow("isn't a position id")
    })
})
