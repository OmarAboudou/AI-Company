import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { julieEnvironment } from "../create-company-with-human-employee.testing.ts"
import type { OpenedTask } from "../task/open-next-task.ts"
import { addTurnText } from "./add-turn-text.ts"
import { clearTurn } from "./clear-turn.ts"
import { createCompanyWithTaskInProgress } from "./create-company-with-task-in-progress.testing.ts"
import { loadStagedTurn } from "./storage.ts"

let projectRoot: string
let openedTask: OpenedTask

beforeEach(async () => {
    const company = await createCompanyWithTaskInProgress()
    projectRoot = company.projectRoot
    openedTask = company.openedTask
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("clearTurn", () => {
    test("empties the person's next turn", async () => {
        await addTurnText(projectRoot, julieEnvironment, "Checking.")

        await clearTurn(projectRoot, julieEnvironment)

        const runId = openedTask.run.id
        const stagedTurn = await loadStagedTurn(projectRoot, runId)
        expect(stagedTurn).toEqual({ blocks: [] })
    })
})
