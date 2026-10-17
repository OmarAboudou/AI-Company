import { describe, expect, test } from "bun:test"
import { PositionConfigSchema, PositionIdSchema } from "./position.ts"

describe("PositionIdSchema", () => {
    test.each(["developer", "backend-developer", "level-2-support"])(
        "accepts %s",
        (id) => {
            expect(PositionIdSchema.safeParse(id).success).toBe(true)
        },
    )

    test.each([
        "",
        "Backend-Developer",
        "backend developer",
        "backend_developer",
        "-developer",
        "developer-",
        "backend--developer",
        "../company",
    ])("rejects %p", (id) => {
        expect(PositionIdSchema.safeParse(id).success).toBe(false)
    })
})

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

    test("rejects an unknown key", () => {
        expect(
            PositionConfigSchema.safeParse({ title: "Developer", id: "dev" })
                .success,
        ).toBe(false)
    })
})
