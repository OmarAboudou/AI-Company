import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { loadJournal } from "../../journal/storage.ts"
import { sendMessage } from "../../messaging/message/send-message.ts"
import {
    createCompanyWithHumanEmployee,
    julieEnvironment,
} from "../create-company-with-human-employee.testing.ts"
import { openNextTask } from "../task/open-next-task.ts"
import { requireRunInProgress } from "./require-run-in-progress.ts"

let projectRoot: string
let threadId: string

beforeEach(async () => {
    const company = await createCompanyWithHumanEmployee()
    projectRoot = company.projectRoot
    threadId = company.threadId
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function askAndOpen(body: string, positionId: string) {
    await sendMessage(projectRoot, {}, threadId, { body })
    const environment = {
        ...julieEnvironment,
        LLMCO_CURRENT_POSITION_ID: positionId,
    }
    const { openedTask } = await openNextTask(projectRoot, environment)
    if (openedTask === undefined) {
        throw new Error(`"${body}" opened no task`)
    }
    return openedTask
}

async function requireJulieRun(environment = julieEnvironment) {
    return requireRunInProgress(await loadJournal(projectRoot), environment)
}

describe("requireRunInProgress", () => {
    test("finds the run of the person's task in progress", async () => {
        const openedTask = await askAndOpen("@qa-tester Ship?", "qa-tester")

        const { task, position, run } = await requireJulieRun()

        expect(task).toEqual(openedTask.task)
        expect(position.id).toBe("qa-tester")
        expect(run).toEqual(openedTask.run)
    })

    test("refuses when no task of the person is in progress", async () => {
        const requiring = requireJulieRun()

        await expect(requiring).rejects.toThrow(
            "No task of yours is in progress: run `aico task next` to open one.",
        )
    })

    test("asks for a position when tasks are in progress as several", async () => {
        await askAndOpen("@qa-tester Ship?", "qa-tester")
        await askAndOpen("@designer Logo?", "designer")

        const requiring = requireJulieRun()

        await expect(requiring).rejects.toThrow(
            "You have tasks in progress as QA (@qa-tester) and Designer (@designer): select the position to answer from",
        )
    })

    test("finds the selected position's run among several", async () => {
        await askAndOpen("@qa-tester Ship?", "qa-tester")
        const logoTask = await askAndOpen("@designer Logo?", "designer")
        const environment = {
            ...julieEnvironment,
            LLMCO_CURRENT_POSITION_ID: "designer",
        }

        const { run } = await requireJulieRun(environment)

        expect(run.id).toBe(logoTask.run.id)
    })
})
