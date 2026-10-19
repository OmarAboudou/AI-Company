import { describe, expect, test } from "bun:test"
import { getRenamedEntity } from "./get-renamed-entity.ts"
import type { IdHistory } from "./id-history-schema.ts"

const developer: IdHistory = {
    id: "developer",
    createdAt: "2026-10-18T14:00:00.000Z",
}

describe("getRenamedEntity", () => {
    test("gives the new id and records the former one", () => {
        const renamedAt = "2026-10-19T09:00:00.000Z"

        const renamedDeveloper = getRenamedEntity(
            developer,
            "api-developer",
            renamedAt,
        )

        expect(renamedDeveloper).toEqual({
            id: "api-developer",
            createdAt: developer.createdAt,
            formerIds: [{ id: "developer", until: renamedAt }],
        })
    })

    test("adds each former id after the previous ones", () => {
        const firstRenamedAt = "2026-10-19T09:00:00.000Z"
        const secondRenamedAt = "2026-10-20T09:00:00.000Z"

        const renamedDeveloper = getRenamedEntity(
            getRenamedEntity(developer, "api-developer", firstRenamedAt),
            "backend-developer",
            secondRenamedAt,
        )

        expect(renamedDeveloper.formerIds).toEqual([
            { id: "developer", until: firstRenamedAt },
            { id: "api-developer", until: secondRenamedAt },
        ])
    })
})
