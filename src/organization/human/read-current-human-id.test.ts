import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { readCurrentHumanId } from "./read-current-human-id.ts"

const variable = "LLMCO_CURRENT_HUMAN_ID"
const shellValue = process.env[variable]

beforeEach(() => {
    delete process.env[variable]
})

afterEach(() => {
    if (shellValue === undefined) {
        delete process.env[variable]
    } else {
        process.env[variable] = shellValue
    }
})

describe("readCurrentHumanId", () => {
    test("is no one, a director, when the variable is unset or empty", () => {
        const unset = readCurrentHumanId()
        process.env[variable] = ""

        expect(unset).toBeUndefined()
        expect(readCurrentHumanId()).toBeUndefined()
    })

    test("is the employee id the variable holds", () => {
        process.env[variable] = "julie"

        expect(readCurrentHumanId()).toBe("julie")
    })

    test("refuses a value that isn't an employee id", () => {
        process.env[variable] = "Julie Martin"

        expect(readCurrentHumanId).toThrow(UserError)
        expect(readCurrentHumanId).toThrow("isn't an employee id")
    })
})
