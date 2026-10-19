import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import { loadCompany } from "../company/storage.ts"
import {
    hasPosition,
    loadPosition,
    loadPositionState,
    savePosition,
    savePositionState,
} from "./storage.ts"
import { updatePositionId } from "./update-position-id.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developer = {
    id: "developer",
    title: "Developer",
    description: "You build the API.",
    defaultEmployeeId: "omar",
    createdAt: "2026-10-18T14:00:00.000Z",
}

describe("updatePositionId", () => {
    test("moves the position to its new id", async () => {
        await savePosition(projectRoot, developer)

        await updatePositionId(projectRoot, "developer", "api-developer")

        const renamed = await loadPosition(projectRoot, "api-developer")
        expect(renamed).toMatchObject({ ...developer, id: "api-developer" })
        expect(await hasPosition(projectRoot, "developer")).toBe(false)
    })

    test("returns the position before and after", async () => {
        await savePosition(projectRoot, developer)

        const renaming = await updatePositionId(projectRoot, "developer", "api")

        const renamed = await loadPosition(projectRoot, "api")
        expect(renaming.position).toEqual(developer)
        expect(renaming.renamedPosition).toEqual(renamed)
    })

    test("records each former id, oldest first, with when it stopped", async () => {
        await savePosition(projectRoot, developer)

        const before = Date.now()
        await updatePositionId(projectRoot, "developer", "api-developer")
        await updatePositionId(projectRoot, "api-developer", "backend")
        const after = Date.now()

        const renamed = await loadPosition(projectRoot, "backend")
        const formerIds = renamed.formerIds ?? []
        const ids = formerIds.map(({ id }) => id)
        const untils = formerIds.map(({ until }) => Date.parse(until))
        expect(renamed.createdAt).toBe(developer.createdAt)
        expect(ids).toEqual(["developer", "api-developer"])
        expect(Math.min(...untils)).toBeGreaterThanOrEqual(before)
        expect(Math.max(...untils)).toBeLessThanOrEqual(after)
    })

    test("starts a history for a position without one", async () => {
        const { createdAt, ...withoutHistory } = developer
        await savePosition(projectRoot, withoutHistory)

        await updatePositionId(projectRoot, "developer", "api-developer")

        const renamed = await loadPosition(projectRoot, "api-developer")
        expect(renamed.createdAt).toBeUndefined()
        expect(renamed.formerIds?.map(({ id }) => id)).toEqual(["developer"])
    })

    test("moves the state with the position", async () => {
        const julie = {
            temporaryAssignment: { kind: "employee", employeeId: "julie" },
        } as const
        await savePosition(projectRoot, developer)
        await savePositionState(projectRoot, "developer", julie)

        await updatePositionId(projectRoot, "developer", "api-developer")

        const [formerState, movedState] = await Promise.all([
            loadPositionState(projectRoot, "developer"),
            loadPositionState(projectRoot, "api-developer"),
        ])
        expect(formerState).toEqual({})
        expect(movedState).toEqual(julie)
    })

    test("makes the company follow its director's position", async () => {
        const before = await loadCompany(projectRoot)

        await updatePositionId(projectRoot, "director", "management")

        const after = await loadCompany(projectRoot)
        expect(before.directorPositionId).toBe("director")
        expect(after.directorPositionId).toBe("management")
    })

    test("refuses an id another position has", async () => {
        const tester = { id: "qa-tester", title: "QA", description: "" }
        await Promise.all([
            savePosition(projectRoot, developer),
            savePosition(projectRoot, tester),
        ])

        const update = updatePositionId(projectRoot, "developer", "qa-tester")

        await expect(update).rejects.toThrow(UserError)
        await expect(update).rejects.toThrow('"qa-tester" already exists.')
        expect(await loadPosition(projectRoot, "qa-tester")).toEqual(tester)
        expect(await hasPosition(projectRoot, "developer")).toBe(true)
    })

    test("refuses a new id that is not kebab-case", async () => {
        await savePosition(projectRoot, developer)

        const update = updatePositionId(projectRoot, "developer", "Dev")

        await expect(update).rejects.toThrow('Invalid position id "Dev"')
    })

    test("refuses an unknown position", async () => {
        const update = updatePositionId(projectRoot, "designer", "ux")

        await expect(update).rejects.toThrow('No position "designer".')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const update = updatePositionId(elsewhere, "developer", "dev")

        await expect(update).rejects.toThrow("Run `llmco init` first.")
    })
})
