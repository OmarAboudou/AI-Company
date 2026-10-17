import { describe, expect, test } from "bun:test"
import { CompanyConfigSchema } from "./company.ts"

function accepts(config: unknown): boolean {
    return CompanyConfigSchema.safeParse(config).success
}

describe("CompanyConfigSchema", () => {
    test("accepts a config with a name", () => {
        expect(CompanyConfigSchema.parse({ name: "Acme" })).toEqual({
            name: "Acme",
        })
    })

    test("trims whitespace around the name", () => {
        const config = CompanyConfigSchema.parse({ name: "  Acme  " })

        expect(config.name).toBe("Acme")
    })

    test("rejects a config without a name", () => {
        expect(accepts({})).toBe(false)
    })

    test("rejects an empty or whitespace-only name", () => {
        expect(accepts({ name: "" })).toBe(false)
        expect(accepts({ name: "   " })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ nmae: "Acme" })).toBe(false)
    })
})
