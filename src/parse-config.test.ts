import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { parseConfig } from "./parse-config.ts"
import { UserError } from "./user-error.ts"

const PositionConfigSchema = z.strictObject({
    title: z.string().trim().min(1),
})

describe("parseConfig", () => {
    test("gives the configuration as its schema parses it", () => {
        const config = parseConfig(PositionConfigSchema, { title: " QA " })

        expect(config).toEqual({ title: "QA" })
    })

    test("refuses a configuration its schema rejects, with zod's message", () => {
        const parsing = () => parseConfig(PositionConfigSchema, { title: "" })

        expect(parsing).toThrow(UserError)
        expect(parsing).toThrow("at title")
    })
})
