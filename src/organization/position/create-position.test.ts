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
        const otherPosition = { title: "Other", description: "" }

        const creation = createPosition(projectRoot, "developer", otherPosition)

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow('"developer" already exists.')
        const keptPosition = await loadPosition(projectRoot, "developer")
        expect(keptPosition.title).toBe("Developer")
    })

    test("refuses an id that is not kebab-case", async () => {
        const creation = createPosition(projectRoot, "../company", developer)

        await expect(creation).rejects.toThrow("kebab-case")
    })

    test("refuses a blank title", async () => {
        const developerWithBlankTitle = { ...developer, title: "  " }

        const creation = createPosition(
            projectRoot,
            "developer",
            developerWithBlankTitle,
        )

        await expect(creation).rejects.toThrow(UserError)
    })

    test("drops a state left behind by a former position of that id", async () => {
        const directorsState = {
            temporaryAssignment: { kind: "directors" },
        } as const
        await savePositionState(projectRoot, "developer", directorsState)
        const before = await loadPositionState(projectRoot, "developer")

        await createPosition(projectRoot, "developer", developer)

        expect(before).toEqual(directorsState)
        expect(await loadPositionState(projectRoot, "developer")).toEqual({})
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const creation = createPosition(
            folderWithoutCompany,
            "developer",
            developer,
        )

        await expect(creation).rejects.toThrow("Run `llmco init` first.")
    })
})
