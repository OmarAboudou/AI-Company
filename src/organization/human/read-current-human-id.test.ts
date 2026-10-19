import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { readCurrentHumanId } from "./read-current-human-id.ts"

const variableName = "LLMCO_CURRENT_HUMAN_ID"
const shellValue = process.env[variableName]

beforeEach(() => {
    delete process.env[variableName]
})

afterEach(() => {
    if (shellValue === undefined) {
        delete process.env[variableName]
    } else {
        process.env[variableName] = shellValue
    }
})

describe("readCurrentHumanId", () => {
    test("is no one, a director, when the variable is unset or empty", () => {
        const currentHumanId = readCurrentHumanId()
        process.env[variableName] = ""

        expect(currentHumanId).toBeUndefined()
        expect(readCurrentHumanId()).toBeUndefined()
    })

    test("is the employee id the variable holds", () => {
        process.env[variableName] = "julie"

        expect(readCurrentHumanId()).toBe("julie")
    })

    test("refuses a value that isn't an employee id", () => {
        process.env[variableName] = "Julie Martin"

        expect(readCurrentHumanId).toThrow(UserError)
        expect(readCurrentHumanId).toThrow("isn't an employee id")
    })
})
