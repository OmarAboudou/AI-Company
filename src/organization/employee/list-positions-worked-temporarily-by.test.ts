import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import {
    listPositions,
    savePosition,
    savePositionState,
} from "../position/storage.ts"
import { listPositionsWorkedTemporarilyBy } from "./list-positions-worked-temporarily-by.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all(
        ["dev", "qa", "ux"].map((id) =>
            savePosition(projectRoot, { id, title: id, description: "" }),
        ),
    )
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("listPositionsWorkedTemporarilyBy", () => {
    test("lists the positions assigned temporarily to the employee, with their state", async () => {
        const julieState = {
            temporaryAssignment: { kind: "employee", employeeId: "julie" },
        } as const
        const directorsState = {
            temporaryAssignment: { kind: "directors" },
        } as const
        await Promise.all([
            savePositionState(projectRoot, "dev", julieState),
            savePositionState(projectRoot, "qa", directorsState),
        ])
        const positions = await listPositions(projectRoot)

        const temporaryPositions = await listPositionsWorkedTemporarilyBy(
            projectRoot,
            positions,
            "julie",
        )

        const positionIds = temporaryPositions.map(
            ({ position }) => position.id,
        )
        expect(positionIds).toEqual(["dev"])
        expect(temporaryPositions[0]?.state).toEqual(julieState)
    })
})
