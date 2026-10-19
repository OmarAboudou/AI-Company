import { describe, expect, test } from "bun:test"
import { ThreadConfigSchema } from "./schema.ts"

const validConfig = {
    subject: "Choice of framework",
    createdAt: "2026-10-18T14:03:22.123Z",
    createdBy: {
        position: { id: "director", title: "Director" },
        committer: { name: "Omar Aboudou", email: "omar@example.com" },
    },
}

function accepts(config: unknown): boolean {
    return ThreadConfigSchema.safeParse(config).success
}

describe("ThreadConfigSchema", () => {
    test("accepts a subject, a creation date and a creator", () => {
        expect(ThreadConfigSchema.parse(validConfig)).toEqual(validConfig)
    })

    test("requires a creation date in UTC", () => {
        const localTime = "2026-10-18T16:03:22+02:00"

        expect(accepts({ ...validConfig, createdAt: localTime })).toBe(false)
        expect(accepts({ ...validConfig, createdAt: "2026-10-18" })).toBe(false)
    })

    test("accepts the employee who created it", () => {
        const employee = { id: "julie", name: "Julie" }
        const createdBy = { ...validConfig.createdBy, employee }

        expect(accepts({ ...validConfig, createdBy })).toBe(true)
    })

    test("requires the creator's position and committer", () => {
        const createdBy = { position: validConfig.createdBy.position }

        expect(accepts({ ...validConfig, createdBy })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...validConfig, members: ["director"] })).toBe(false)
    })
})
