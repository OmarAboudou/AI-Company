import { describe, expect, test } from "bun:test"
import { CompanyConfigSchema } from "./schema.ts"

const acme = { name: "Acme", founderPositionId: "founder" }

function accepts(config: unknown): boolean {
    return CompanyConfigSchema.safeParse(config).success
}

describe("CompanyConfigSchema", () => {
    test("accepts a config with a name and a founder's position", () => {
        expect(CompanyConfigSchema.parse(acme)).toEqual(acme)
    })

    test("trims whitespace around the name", () => {
        const config = CompanyConfigSchema.parse({ ...acme, name: "  Acme  " })

        expect(config.name).toBe("Acme")
    })

    test("rejects a config without a name", () => {
        expect(accepts({ founderPositionId: "founder" })).toBe(false)
    })

    test("rejects an empty or whitespace-only name", () => {
        expect(accepts({ ...acme, name: "" })).toBe(false)
        expect(accepts({ ...acme, name: "   " })).toBe(false)
    })

    test("requires a kebab-case founder's position", () => {
        expect(accepts({ name: "Acme" })).toBe(false)
        expect(accepts({ ...acme, founderPositionId: "Founder" })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...acme, nmae: "Acme" })).toBe(false)
    })
})
