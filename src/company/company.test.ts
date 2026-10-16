import { describe, expect, test } from "bun:test"
import { CompanyConfigSchema } from "./company.ts"

describe("CompanyConfigSchema", () => {
    test("accepte une config avec un nom", () => {
        expect(CompanyConfigSchema.parse({ name: "Acme" })).toEqual({
            name: "Acme",
        })
    })

    test("retire les espaces autour du nom", () => {
        expect(CompanyConfigSchema.parse({ name: "  Acme  " }).name).toBe(
            "Acme",
        )
    })

    test("refuse une config sans nom", () => {
        expect(CompanyConfigSchema.safeParse({}).success).toBe(false)
    })

    test("refuse un nom vide ou fait d'espaces", () => {
        expect(CompanyConfigSchema.safeParse({ name: "" }).success).toBe(false)
        expect(CompanyConfigSchema.safeParse({ name: "   " }).success).toBe(
            false,
        )
    })

    test("refuse une clé inconnue", () => {
        expect(CompanyConfigSchema.safeParse({ nmae: "Acme" }).success).toBe(
            false,
        )
    })
})
