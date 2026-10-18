import { describe, expect, test } from "bun:test"
import {
    currentId,
    hadId,
    type IdHistory,
    IdHistorySchema,
    withNewId,
} from "./id-history.ts"

function accepts(config: unknown): boolean {
    return IdHistorySchema.safeParse(config).success
}

const developer: IdHistory = {
    id: "developer",
    createdAt: "2026-10-18T14:00:00.000Z",
}

describe("IdHistorySchema", () => {
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

const renamed: IdHistory = {
    id: "backend-developer",
    createdAt: "2026-10-18T14:00:00.000Z",
    formerIds: [
        { id: "developer", until: "2026-10-19T09:00:00.000Z" },
        { id: "api-developer", until: "2026-10-20T09:00:00.000Z" },
    ],
}

describe("hadId", () => {
    test.each([
        ["developer", "2026-10-18T14:00:00.000Z"],
        ["developer", "2026-10-19T08:59:59.999Z"],
        ["api-developer", "2026-10-19T09:00:00.000Z"],
        ["backend-developer", "2026-10-20T09:00:00.000Z"],
        ["backend-developer", "2030-01-01T00:00:00.000Z"],
    ])("is true for %s at %s", (id, at) => {
        expect(hadId(renamed, id, at)).toBe(true)
    })

    test.each([
        ["developer", "2026-10-18T13:59:59.999Z"],
        ["developer", "2026-10-19T09:00:00.000Z"],
        ["api-developer", "2026-10-18T15:00:00.000Z"],
        ["backend-developer", "2026-10-19T09:00:00.000Z"],
        ["qa-tester", "2026-10-19T09:00:00.000Z"],
    ])("is false for %s at %s", (id, at) => {
        expect(hadId(renamed, id, at)).toBe(false)
    })

    test("counts an entity without createdAt as existing since always", () => {
        const legacy = { id: "developer" }
        const longAgo = "2000-01-01T00:00:00.000Z"

        expect(hadId(legacy, "developer", longAgo)).toBe(true)
    })

    test("compares instants, whatever their precision", () => {
        const at = "2026-10-19T08:59:59Z"

        expect(hadId(renamed, "developer", at)).toBe(true)
    })
})

describe("currentId", () => {
    const positions = [renamed, { id: "qa-tester" }]

    test("is the id of whoever had the id then", () => {
        const at = "2026-10-18T15:00:00.000Z"

        expect(currentId(positions, "developer", at)).toBe("backend-developer")
    })

    test("is the id itself when nobody had it then", () => {
        const at = "2026-10-18T15:00:00.000Z"

        expect(currentId(positions, "designer", at)).toBe("designer")
    })
})
