import { describe, expect, test } from "bun:test"
import { CompanyConfigSchema } from "./company.ts"

describe("CompanyConfigSchema", () => {
    test("accepts a config with a name", () => {
        expect(CompanyConfigSchema.parse({ name: "Acme" })).toEqual({
            name: "Acme",
        })
    })

    test("trims whitespace around the name", () => {
        expect(CompanyConfigSchema.parse({ name: "  Acme  " }).name).toBe(
            "Acme",
        )
    })

    test("rejects a config without a name", () => {
        expect(CompanyConfigSchema.safeParse({}).success).toBe(false)
    })

    test("rejects an empty or whitespace-only name", () => {
        expect(CompanyConfigSchema.safeParse({ name: "" }).success).toBe(false)
        expect(CompanyConfigSchema.safeParse({ name: "   " }).success).toBe(
            false,
        )
    })

    test("rejects an unknown key", () => {
        expect(CompanyConfigSchema.safeParse({ nmae: "Acme" }).success).toBe(
            false,
        )
    })
})
