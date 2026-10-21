import { describe, expect, test } from "bun:test"
import { createTimeOrderedId } from "./create-time-ordered-id.ts"
import { IdSchema } from "./id-schema.ts"

const sentAt = "2026-10-18T14:03:22.123Z"

describe("createTimeOrderedId", () => {
    test("is the time with a random suffix", () => {
        const id = createTimeOrderedId(sentAt)

        expect(id).toMatch(/^20261018-140322-123-[0-9a-f]{4}$/)
        expect(IdSchema.safeParse(id).success).toBe(true)
    })

    test("differs between two ids created for the same time", () => {
        const ids = new Set(
            Array.from({ length: 20 }, () => createTimeOrderedId(sentAt)),
        )

        expect(ids.size).toBeGreaterThan(1)
    })
})
