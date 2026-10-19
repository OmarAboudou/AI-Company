import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import {
    listPositions,
    savePosition,
    savePositionState,
} from "../position/storage.ts"
import { listPositionsWorkedBy } from "./list-positions-worked-by.ts"
import type { CurrentHuman } from "./read-current-human.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        savePosition(projectRoot, {
            id: "dev",
            title: "Developer",
            description: "",
            defaultEmployeeId: "julie",
        }),
        savePosition(projectRoot, {
            id: "qa",
            title: "QA",
            description: "",
            defaultEmployeeId: "julie",
        }),
        savePosition(projectRoot, { id: "ux", title: "UX", description: "" }),
        savePositionState(projectRoot, "qa", {
            temporaryAssignment: { kind: "directors" },
        }),
        savePositionState(projectRoot, "ux", {
            temporaryAssignment: { kind: "employee", employeeId: "julie" },
        }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const julie: CurrentHuman = {
    kind: "employee",
    employee: { id: "julie", name: "Julie", kind: "human" },
}

async function listIdsWorkedBy(human: CurrentHuman) {
    const positions = await listPositions(projectRoot)
    const worked = await listPositionsWorkedBy(
        projectRoot,
        human,
        positions,
        "director",
    )
    return worked.map(({ position, isTemporary }) =>
        isTemporary ? `${position.id} (temporarily)` : position.id,
    )
}

describe("listPositionsWorkedBy", () => {
    test("lists what an employee works by default or temporarily", async () => {
        const workedIds = await listIdsWorkedBy(julie)

        expect(workedIds).toEqual(["dev", "ux (temporarily)"])
    })

    test("lists the director's position and what the directors cover", async () => {
        const workedIds = await listIdsWorkedBy({ kind: "director" })

        expect(workedIds).toEqual(["director", "qa (temporarily)"])
    })
})
