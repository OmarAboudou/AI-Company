import { describe, expect, test } from "bun:test"
import { PositionConfigSchema } from "./position.ts"

const developer = { title: "Developer" }

function accepts(config: unknown): boolean {
    return PositionConfigSchema.safeParse(config).success
}

describe("PositionConfigSchema", () => {
    test("accepts a config with a title", () => {
        expect(PositionConfigSchema.parse(developer)).toEqual(developer)
    })

    test("trims whitespace around the title", () => {
        const config = PositionConfigSchema.parse({ title: " Developer " })

        expect(config.title).toBe("Developer")
    })

    test("rejects an empty or whitespace-only title", () => {
        expect(accepts({ title: "" })).toBe(false)
        expect(accepts({ title: "   " })).toBe(false)
    })

    test("accepts the id of the default employee", () => {
        const filled = { ...developer, defaultEmployee: "claude-senior" }

        expect(PositionConfigSchema.parse(filled)).toEqual(filled)
    })

    test("rejects a default employee id that is not kebab-case", () => {
        const config = { ...developer, defaultEmployee: "Claude Senior" }

        expect(accepts(config)).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...developer, id: "dev" })).toBe(false)
    })
})
