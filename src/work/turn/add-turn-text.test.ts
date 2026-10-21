import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { julieEnvironment } from "../create-company-with-human-employee.testing.ts"
import type { OpenedTask } from "../task/open-next-task.ts"
import { addTurnText } from "./add-turn-text.ts"
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

describe("addTurnText", () => {
    test("adds a text at the end of the person's next turn", async () => {
        await addTurnText(projectRoot, julieEnvironment, "Checking.")

        const stagedTurn = await addTurnText(
            projectRoot,
            julieEnvironment,
            "Still checking.",
        )

        expect(stagedTurn).toEqual({
            blocks: [
                { type: "text", text: "Checking." },
                { type: "text", text: "Still checking." },
            ],
        })
        const runId = openedTask.run.id
        expect(await loadStagedTurn(projectRoot, runId)).toEqual(stagedTurn)
    })

    test("refuses an empty text", async () => {
        const adding = addTurnText(projectRoot, julieEnvironment, " \n")

        await expect(adding).rejects.toThrow("The text is empty.")
    })
})
