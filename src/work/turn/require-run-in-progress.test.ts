import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { loadJournal } from "../../journal/storage.ts"
import { createCompanyHeldByUser } from "../create-company-held-by-user.testing.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../send-example-message.testing.ts"
import { openNextTask } from "../task/open-next-task.ts"
import { requireRunInProgress } from "./require-run-in-progress.ts"

let projectRoot: string
let ticketNumber: number

beforeEach(async () => {
    const company = await createCompanyHeldByUser()
    projectRoot = company.projectRoot
    ticketNumber = company.ticketNumber
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function askAndOpen(body: string, positionId: string) {
    await sendExampleMessage(
        projectRoot,
        ticketNumber,
        body,
        createExampleWorkCatalog([positionId]),
    )
    const environment = { AICO_CURRENT_POSITION_ID: positionId }
    const { openedTask } = await openNextTask(
        projectRoot,
        environment,
        createExampleWorkCatalog(),
    )
    if (openedTask === undefined) {
        throw new Error(`"${body}" opened no task`)
    }
    return openedTask
}

async function requirePersonRun(environment: NodeJS.ProcessEnv = {}) {
    return requireRunInProgress(await loadJournal(projectRoot), environment)
}

describe("requireRunInProgress", () => {
    test("finds the run of the person's task in progress", async () => {
        const openedTask = await askAndOpen("Ship?", "qa-tester")

        const { task, position, run } = await requirePersonRun()

        expect(task).toEqual(openedTask.task)
        expect(position.id).toBe("qa-tester")
        expect(run).toEqual(openedTask.run)
    })

    test("refuses when no task of the person is in progress", async () => {
        const requiring = requirePersonRun()

        await expect(requiring).rejects.toThrow(
            "No task of yours is in progress: run `aico task next` to open one.",
        )
    })

    test("asks for a position when tasks are in progress as several", async () => {
        await askAndOpen("Ship?", "qa-tester")
        await askAndOpen("Logo?", "designer")

        const requiring = requirePersonRun()

        await expect(requiring).rejects.toThrow(
            "You have tasks in progress as QA (@qa-tester) and Designer (@designer): select the position to answer from",
        )
    })

    test("finds the selected position's run among several", async () => {
        await askAndOpen("Ship?", "qa-tester")
        const logoTask = await askAndOpen("Logo?", "designer")
        const environment = {
            AICO_CURRENT_POSITION_ID: "designer",
        }

        const { run } = await requirePersonRun(environment)

        expect(run.id).toBe(logoTask.run.id)
    })
})
