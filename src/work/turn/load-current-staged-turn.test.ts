import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { julieEnvironment } from "../create-company-with-human-employee.testing.ts"
import { addTurnText } from "./add-turn-text.ts"
import { createCompanyWithTaskInProgress } from "./create-company-with-task-in-progress.testing.ts"
import { loadCurrentStagedTurn } from "./load-current-staged-turn.ts"

let projectRoot: string

beforeEach(async () => {
    const company = await createCompanyWithTaskInProgress()
    projectRoot = company.projectRoot
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("loadCurrentStagedTurn", () => {
    test("loads the turn the person prepares in their task in progress", async () => {
        const addedTurn = await addTurnText(
            projectRoot,
            julieEnvironment,
            "Checking.",
        )

        const stagedTurn = await loadCurrentStagedTurn(
            projectRoot,
            julieEnvironment,
        )

        expect(stagedTurn).toEqual(addedTurn)
    })
})
