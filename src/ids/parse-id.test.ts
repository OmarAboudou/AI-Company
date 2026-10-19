import { describe, expect, test } from "bun:test"
import { UserError } from "../user-error.ts"
import { parseId } from "./parse-id.ts"

describe("parseId", () => {
    test("returns a kebab-case id", () => {
        const id = parseId("position", "backend-developer")

        expect(id).toBe("backend-developer")
    })

    test("refuses an id that is not kebab-case, naming its entity", () => {
        const parse = () => parseId("position", "Backend Developer")

        expect(parse).toThrow(UserError)
        expect(parse).toThrow('Invalid position id "Backend Developer".')
        expect(parse).toThrow("kebab-case")
    })
})
