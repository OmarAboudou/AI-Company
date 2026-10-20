import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { readCurrentPositionId } from "./read-current-position-id.ts"

const variableName = "LLMCO_CURRENT_POSITION_ID"
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

describe("readCurrentPositionId", () => {
    test("is no position when the variable is unset or empty", () => {
        const currentPositionId = readCurrentPositionId()
        process.env[variableName] = ""

        expect(currentPositionId).toBeUndefined()
        expect(readCurrentPositionId()).toBeUndefined()
    })

    test("is the position id the variable holds", () => {
        process.env[variableName] = "backend-developer"

        expect(readCurrentPositionId()).toBe("backend-developer")
    })

    test("refuses a value that isn't a position id", () => {
        process.env[variableName] = "Backend Developer"

        expect(readCurrentPositionId).toThrow(UserError)
        expect(readCurrentPositionId).toThrow("isn't a position id")
    })
})
