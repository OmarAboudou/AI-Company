import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { type IdHistory, idHistoryShape, withNewId } from "./id-history.ts"

const IdHistorySchema = z.strictObject(idHistoryShape)

function accepts(config: unknown): boolean {
    return IdHistorySchema.safeParse(config).success
}

const developer: IdHistory = {
    id: "developer",
    createdAt: "2026-10-18T14:00:00.000Z",
}

describe("idHistoryShape", () => {
    test("accepts no history: created before llmco recorded it", () => {
        expect(accepts({})).toBe(true)
    })

    test("accepts a creation date and former ids", () => {
        const formerIds = [{ id: "dev", until: "2026-10-19T09:00:00.000Z" }]
        const history = { createdAt: developer.createdAt, formerIds }

        expect(accepts(history)).toBe(true)
    })

    test("requires dates in UTC", () => {
        const local = "2026-10-18T16:00:00+02:00"
        const formerIds = [{ id: "dev", until: local }]

        expect(accepts({ createdAt: local })).toBe(false)
        expect(accepts({ formerIds })).toBe(false)
    })

    test("rejects a former id that isn't kebab-case", () => {
        const formerIds = [{ id: "Dev", until: developer.createdAt }]

        expect(accepts({ formerIds })).toBe(false)
    })
})

describe("withNewId", () => {
    test("gives the new id and records the former one", () => {
        const until = "2026-10-19T09:00:00.000Z"

        const renamed = withNewId(developer, "api-developer", until)

        expect(renamed).toEqual({
            id: "api-developer",
            createdAt: developer.createdAt,
            formerIds: [{ id: "developer", until }],
        })
    })

    test("adds each former id after the previous ones", () => {
        const first = "2026-10-19T09:00:00.000Z"
        const second = "2026-10-20T09:00:00.000Z"

        const renamed = withNewId(
            withNewId(developer, "api-developer", first),
            "backend-developer",
            second,
        )

        expect(renamed.formerIds).toEqual([
            { id: "developer", until: first },
            { id: "api-developer", until: second },
        ])
    })
})
