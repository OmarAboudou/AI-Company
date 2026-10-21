import { describe, expect, test } from "bun:test"
import { CompanyConfigSchema } from "./schema.ts"

const acme = { name: "Acme", directorPositionId: "director" }

function accepts(config: unknown): boolean {
    return CompanyConfigSchema.safeParse(config).success
}

describe("CompanyConfigSchema", () => {
    test("accepts a config with a name and a director's position", () => {
        expect(CompanyConfigSchema.parse(acme)).toEqual(acme)
    })

    test("trims whitespace around the name", () => {
        const config = CompanyConfigSchema.parse({ ...acme, name: "  Acme  " })

        expect(config.name).toBe("Acme")
    })

    test("rejects a config without a name", () => {
        expect(accepts({ directorPositionId: "director" })).toBe(false)
    })

    test("rejects an empty or whitespace-only name", () => {
        expect(accepts({ ...acme, name: "" })).toBe(false)
        expect(accepts({ ...acme, name: "   " })).toBe(false)
    })

    test("requires a kebab-case director's position", () => {
        expect(accepts({ name: "Acme" })).toBe(false)
        expect(accepts({ ...acme, directorPositionId: "Director" })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...acme, nmae: "Acme" })).toBe(false)
    })

    test("accepts how deep chains of tasks may grow", () => {
        expect(accepts({ ...acme, maxTaskDepth: 50 })).toBe(true)
    })

    test.each([0, 2.5])("rejects a maximum depth of %d tasks", (depth) => {
        expect(accepts({ ...acme, maxTaskDepth: depth })).toBe(false)
    })
})
