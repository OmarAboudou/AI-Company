import { describe, expect, test } from "bun:test"
import { currentId } from "./get-current-id.ts"
import type { IdHistory } from "./id-history-schema.ts"

const renamed: IdHistory = {
    id: "backend-developer",
    createdAt: "2026-10-18T14:00:00.000Z",
    formerIds: [
        { id: "developer", until: "2026-10-19T09:00:00.000Z" },
        { id: "api-developer", until: "2026-10-20T09:00:00.000Z" },
    ],
}

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
