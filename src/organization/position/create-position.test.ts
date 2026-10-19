import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import { createPosition } from "./create-position.ts"
import {
    loadPosition,
    loadPositionState,
    savePositionState,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developer = { title: "Developer", description: "You build the API." }

describe("createPosition", () => {
    test("saves the position with its title and description", async () => {
        await createPosition(projectRoot, "developer", developer)

        const position = await loadPosition(projectRoot, "developer")
        expect(position).toMatchObject({ id: "developer", ...developer })
    })

    test("records when the position was created", async () => {
        const before = Date.now()
        await createPosition(projectRoot, "developer", developer)
        const after = Date.now()

        const { createdAt } = await loadPosition(projectRoot, "developer")
        const createdTime = Date.parse(createdAt ?? "")
        expect(createdTime).toBeGreaterThanOrEqual(before)
        expect(createdTime).toBeLessThanOrEqual(after)
    })

    test("returns the position it saved", async () => {
        const position = await createPosition(projectRoot, "qa", developer)

        expect(position).toEqual(await loadPosition(projectRoot, "qa"))
    })

    test("refuses an id another position has, and keeps that one", async () => {
        await createPosition(projectRoot, "developer", developer)
        const other = { title: "Other", description: "" }

        const creation = createPosition(projectRoot, "developer", other)

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow('"developer" already exists.')
        const kept = await loadPosition(projectRoot, "developer")
        expect(kept.title).toBe("Developer")
    })

    test("refuses an id that is not kebab-case", async () => {
        const creation = createPosition(projectRoot, "../company", developer)

        await expect(creation).rejects.toThrow("kebab-case")
    })

    test("refuses a blank title", async () => {
        const blank = { ...developer, title: "  " }

        const creation = createPosition(projectRoot, "developer", blank)

        await expect(creation).rejects.toThrow(UserError)
    })

    test("drops a state left behind by a former position of that id", async () => {
        const directors = {
            temporaryAssignment: { kind: "directors" },
        } as const
        await savePositionState(projectRoot, "developer", directors)
        const before = await loadPositionState(projectRoot, "developer")

        await createPosition(projectRoot, "developer", developer)

        expect(before).toEqual(directors)
        expect(await loadPositionState(projectRoot, "developer")).toEqual({})
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const creation = createPosition(elsewhere, "developer", developer)

        await expect(creation).rejects.toThrow("Run `llmco init` first.")
    })
})
