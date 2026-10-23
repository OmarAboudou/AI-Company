import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { readCurrentHumanId } from "./read-current-human-id.ts"

describe("readCurrentHumanId", () => {
    test("is no one, a director, when the variable is unset or empty", () => {
        const unsetId = readCurrentHumanId({})
        const emptyId = readCurrentHumanId({ AICO_CURRENT_HUMAN_ID: "" })

        expect(unsetId).toBeUndefined()
        expect(emptyId).toBeUndefined()
    })

    test("is the employee id the variable holds", () => {
        const currentHumanId = readCurrentHumanId({
            AICO_CURRENT_HUMAN_ID: "julie",
        })

        expect(currentHumanId).toBe("julie")
    })

    test("refuses a value that isn't an employee id", () => {
        const environment = { AICO_CURRENT_HUMAN_ID: "Julie Martin" }

        const reading = () => readCurrentHumanId(environment)

        expect(reading).toThrow(UserError)
        expect(reading).toThrow("isn't an employee id")
    })
})
