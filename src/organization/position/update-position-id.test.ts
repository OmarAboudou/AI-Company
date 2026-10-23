import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { loadCompany } from "../company/storage.ts"
import { hasPosition, loadPosition, savePosition } from "./storage.ts"
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
    employeeId: "omar",
    createdAt: "2026-10-18T14:00:00.000Z",
}

describe("updatePositionId", () => {
    test("moves the position to its new id", async () => {
        await savePosition(projectRoot, developer)

        await updatePositionId(projectRoot, "developer", "api-developer")

        const renamedDeveloper = await loadPosition(
            projectRoot,
            "api-developer",
        )
        expect(renamedDeveloper).toMatchObject({
            ...developer,
            id: "api-developer",
        })
        expect(await hasPosition(projectRoot, "developer")).toBe(false)
    })

    test("returns the position before and after", async () => {
        await savePosition(projectRoot, developer)

        const renaming = await updatePositionId(projectRoot, "developer", "api")

        const renamedDeveloper = await loadPosition(projectRoot, "api")
        expect(renaming.position).toEqual(developer)
        expect(renaming.renamedPosition).toEqual(renamedDeveloper)
    })

    test("records each former id, oldest first, with when it stopped", async () => {
        await savePosition(projectRoot, developer)

        const before = Date.now()
        await updatePositionId(projectRoot, "developer", "api-developer")
        await updatePositionId(projectRoot, "api-developer", "backend")
        const after = Date.now()

        const renamedDeveloper = await loadPosition(projectRoot, "backend")
        const formerIds = renamedDeveloper.formerIds ?? []
        const recordedIds = formerIds.map(({ id }) => id)
        const untilTimes = formerIds.map(({ until }) => Date.parse(until))
        expect(renamedDeveloper.createdAt).toBe(developer.createdAt)
        expect(recordedIds).toEqual(["developer", "api-developer"])
        expect(Math.min(...untilTimes)).toBeGreaterThanOrEqual(before)
        expect(Math.max(...untilTimes)).toBeLessThanOrEqual(after)
    })

    test("starts a history for a position without one", async () => {
        const { createdAt, ...withoutHistory } = developer
        await savePosition(projectRoot, withoutHistory)

        await updatePositionId(projectRoot, "developer", "api-developer")

        const renamedDeveloper = await loadPosition(
            projectRoot,
            "api-developer",
        )
        expect(renamedDeveloper.createdAt).toBeUndefined()
        expect(renamedDeveloper.formerIds?.map(({ id }) => id)).toEqual([
            "developer",
        ])
    })

    test("makes the company follow its founder's position", async () => {
        const before = await loadCompany(projectRoot)

        await updatePositionId(projectRoot, "founder", "management")

        const after = await loadCompany(projectRoot)
        expect(before.founderPositionId).toBe("founder")
        expect(after.founderPositionId).toBe("management")
    })

    test("refuses an id another position has", async () => {
        const tester = { id: "qa-tester", title: "QA", description: "" }
        await Promise.all([
            savePosition(projectRoot, developer),
            savePosition(projectRoot, tester),
        ])

        const updating = updatePositionId(projectRoot, "developer", "qa-tester")

        await expect(updating).rejects.toThrow(UserError)
        await expect(updating).rejects.toThrow('"qa-tester" already exists.')
        expect(await loadPosition(projectRoot, "qa-tester")).toEqual(tester)
        expect(await hasPosition(projectRoot, "developer")).toBe(true)
    })

    test("refuses a new id that is not kebab-case", async () => {
        await savePosition(projectRoot, developer)

        const updating = updatePositionId(projectRoot, "developer", "Dev")

        await expect(updating).rejects.toThrow('Invalid position id "Dev"')
    })

    test("refuses an unknown position", async () => {
        const updating = updatePositionId(projectRoot, "designer", "ux")

        await expect(updating).rejects.toThrow('No position "designer".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const updating = updatePositionId(
            folderWithoutCompany,
            "developer",
            "dev",
        )

        await expect(updating).rejects.toThrow("Run `aico init` first.")
    })
})
