import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { UserError } from "../user-error.ts"
import { parseJsonText } from "./parse-json-text.ts"

const schema = z.strictObject({ title: z.string().min(1) })
const location = ".aico/.state/runs/20261018-140324-000-1b2c.jsonl, line 2"

function parseFakeLine(text: string) {
    return () => parseJsonText(text, schema, location)
}

describe("parseJsonText", () => {
    test("returns the parsed and validated content", () => {
        const content = parseJsonText('{ "title": "Developer" }', schema, "")

        expect(content).toEqual({ title: "Developer" })
    })

    test("reports invalid JSON with where it was read", () => {
        const parsing = parseFakeLine("{ title: ")

        expect(parsing).toThrow(UserError)
        expect(parsing).toThrow(`Invalid JSON in ${location}`)
    })

    test("reports schema errors with where it was read, and the field", () => {
        const parsing = parseFakeLine('{ "title": "" }')
        const refusalPattern = /Invalid .*, line 2:\n.*\n.*at title/

        expect(parsing).toThrow(UserError)
        expect(parsing).toThrow(refusalPattern)
    })
})
