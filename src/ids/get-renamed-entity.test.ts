import { describe, expect, test } from "bun:test"
import { getRenamedEntity } from "./get-renamed-entity.ts"
import type { IdHistory } from "./id-history-schema.ts"

const developer: IdHistory = {
    id: "developer",
    createdAt: "2026-10-18T14:00:00.000Z",
}

describe("getRenamedEntity", () => {
    test("gives the new id and records the former one", () => {
        const until = "2026-10-19T09:00:00.000Z"

        const renamed = getRenamedEntity(developer, "api-developer", until)

        expect(renamed).toEqual({
            id: "api-developer",
            createdAt: developer.createdAt,
            formerIds: [{ id: "developer", until }],
        })
    })

    test("adds each former id after the previous ones", () => {
        const first = "2026-10-19T09:00:00.000Z"
        const second = "2026-10-20T09:00:00.000Z"

        const renamed = getRenamedEntity(
            getRenamedEntity(developer, "api-developer", first),
            "backend-developer",
            second,
        )

        expect(renamed.formerIds).toEqual([
            { id: "developer", until: first },
            { id: "api-developer", until: second },
        ])
    })
})
