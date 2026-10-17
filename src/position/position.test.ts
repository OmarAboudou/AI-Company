import { describe, expect, test } from "bun:test"
import { PositionConfigSchema } from "./position.ts"

describe("PositionConfigSchema", () => {
    test("accepts a config with a title", () => {
        expect(
            PositionConfigSchema.parse({ title: "Backend Developer" }),
        ).toEqual({ title: "Backend Developer" })
    })

    test("trims whitespace around the title", () => {
        expect(
            PositionConfigSchema.parse({ title: "  Developer  " }).title,
        ).toBe("Developer")
    })

    test("rejects an empty or whitespace-only title", () => {
        expect(PositionConfigSchema.safeParse({ title: "" }).success).toBe(
            false,
        )
        expect(PositionConfigSchema.safeParse({ title: "   " }).success).toBe(
            false,
        )
    })

    test("accepts the id of the employee filling the position", () => {
        expect(
            PositionConfigSchema.parse({
                title: "Developer",
                employee: "claude-senior",
            }),
        ).toEqual({ title: "Developer", employee: "claude-senior" })
    })

    test("rejects an employee id that is not kebab-case", () => {
        expect(
            PositionConfigSchema.safeParse({
                title: "Developer",
                employee: "Claude Senior",
            }).success,
        ).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(
            PositionConfigSchema.safeParse({ title: "Developer", id: "dev" })
                .success,
        ).toBe(false)
    })
})
