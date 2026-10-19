import { describe, expect, test } from "bun:test"
import { hadIdAt } from "./had-id-at.ts"
import type { IdHistory } from "./id-history-schema.ts"

const renamed: IdHistory = {
    id: "backend-developer",
    createdAt: "2026-10-18T14:00:00.000Z",
    formerIds: [
        { id: "developer", until: "2026-10-19T09:00:00.000Z" },
        { id: "api-developer", until: "2026-10-20T09:00:00.000Z" },
    ],
}

describe("hadIdAt", () => {
    test.each([
        ["developer", "2026-10-18T14:00:00.000Z"],
        ["developer", "2026-10-19T08:59:59.999Z"],
        ["api-developer", "2026-10-19T09:00:00.000Z"],
        ["backend-developer", "2026-10-20T09:00:00.000Z"],
        ["backend-developer", "2030-01-01T00:00:00.000Z"],
    ])("is true for %s at %s", (id, at) => {
        expect(hadIdAt(renamed, id, at)).toBe(true)
    })

    test.each([
        ["developer", "2026-10-18T13:59:59.999Z"],
        ["developer", "2026-10-19T09:00:00.000Z"],
        ["api-developer", "2026-10-18T15:00:00.000Z"],
        ["backend-developer", "2026-10-19T09:00:00.000Z"],
        ["qa-tester", "2026-10-19T09:00:00.000Z"],
    ])("is false for %s at %s", (id, at) => {
        expect(hadIdAt(renamed, id, at)).toBe(false)
    })

    test("counts an entity without createdAt as existing since always", () => {
        const legacy = { id: "developer" }
        const longAgo = "2000-01-01T00:00:00.000Z"

        expect(hadIdAt(legacy, "developer", longAgo)).toBe(true)
    })

    test("compares instants, whatever their precision", () => {
        const at = "2026-10-19T08:59:59Z"

        expect(hadIdAt(renamed, "developer", at)).toBe(true)
    })
})
