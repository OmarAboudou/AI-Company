import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { runGit } from "../../git/run-git.ts"
import { listEvents } from "../../journal/storage.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.testing.ts"
import { listMessages } from "../../messaging/message/storage.ts"
import { assignPosition } from "../../organization/position/assign-position.ts"
import { UserError } from "../../user-error.ts"
import { createCompanyWithLlmEmployee } from "../create-company-with-llm-employee.testing.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../send-example-message.testing.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import { listTasks } from "../task/storage.ts"
import type { WorkCatalog } from "../work-catalog.ts"
import { type RunReadyTasksProgress, runReadyTasks } from "./run-ready-tasks.ts"

const fakeServer = useFakeAnthropicServer()
const environment = { TEST_ANTHROPIC_KEY: "sk-test" }
const developerCatalog = createExampleWorkCatalog(["backend-developer"])
let projectRoot: string
let ticketNumber: number
let progresses: RunReadyTasksProgress[]

beforeEach(async () => {
    const companyWithLlmEmployee = await createCompanyWithLlmEmployee(
        fakeServer.getUrl(),
    )
    projectRoot = companyWithLlmEmployee.projectRoot
    ticketNumber = companyWithLlmEmployee.ticketNumber
    progresses = []
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function runFakeTasks(catalog: WorkCatalog = developerCatalog) {
    return runReadyTasks(
        projectRoot,
        environment,
        "aico run",
        (progress) => progresses.push(progress),
        catalog,
    )
}

async function sendQuestion(
    body: string,
    catalog: WorkCatalog = developerCatalog,
) {
    await sendExampleMessage(projectRoot, ticketNumber, body, catalog)
}

async function listTaskStates() {
    const [tasks, events] = await Promise.all([
        listTasks(projectRoot),
        listEvents(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, events)
    return tasks.map(({ id }) => taskStates.get(id))
}

const showingReply = {
    toolCalls: [{ name: "ticket_show", input: { from: 1 } }],
}

describe("runReadyTasks", () => {
    test("runs the task of a position an LLM works", async () => {
        await sendQuestion("Hono or Express?")
        fakeServer.respondWith(showingReply, { text: "Hono." })

        const { waitingTasks } = await runFakeTasks()

        const messages = await listMessages(projectRoot, ticketNumber)
        expect(messages.map(({ body }) => body)).toEqual([
            "Hono or Express?",
            "Hono.",
        ])
        expect(await listTaskStates()).toEqual(["done"])
        expect(waitingTasks).toEqual([])
    })

    test("commits its steps as aico run, and each tool call apart", async () => {
        await sendQuestion("Hono or Express?")
        fakeServer.respondWith({
            text: "Hono.",
            toolCalls: [{ name: "ticket_deliver", input: { body: "Done." } }],
        })

        await runFakeTasks()

        const [task] = await listTasks(projectRoot)
        const logArgs = ["log", "-6", "--format=%s"]
        const log = runGit(join(projectRoot, ".aico"), logArgs)
        expect(log?.split("\n")).toEqual([
            "aico run",
            "aico run",
            `ticket_deliver in task ${task?.id}`,
            `text in task ${task?.id}`,
            "aico run",
            "aico run",
        ])
    })

    test("reports each task as it starts and ends", async () => {
        await sendQuestion("Hono or Express?")
        fakeServer.respondWith(showingReply, { text: "Hono." })

        await runFakeTasks()

        const kinds = progresses
            .map(({ kind }) => kind)
            .filter((kind, index, allKinds) => kind !== allKinds[index - 1])
        expect(kinds).toEqual([
            "task-started",
            "tool-call",
            "tool-result",
            "text",
            "task-ended",
        ])
    })

    test("runs the tasks its runs create, until none is ready", async () => {
        const catalog = createExampleWorkCatalog([
            "backend-developer",
            "director",
        ])
        await sendQuestion("Hono or Express?", catalog)
        fakeServer.respondWith({ text: "Hono, for Bun." })

        const { waitingTasks } = await runFakeTasks(catalog)

        expect(await listTaskStates()).toEqual(["done", "queued"])
        expect(waitingTasks).toMatchObject([
            { positionId: "director", reason: "worked-by-directors" },
        ])
    })

    test("stops at a task that failed, before the next one", async () => {
        await assignPosition(projectRoot, "qa-tester", "julie")
        const catalog = createExampleWorkCatalog([
            "backend-developer",
            "qa-tester",
        ])
        await sendQuestion("Hono or Express?", catalog)
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })

        const failedRun = runFakeTasks(catalog)

        await expect(failedRun).rejects.toThrow(UserError)
        await expect(failedRun).rejects.toThrow(
            "aico run stops at the failure of task",
        )
        expect(await listTaskStates()).toEqual(["failed", "queued"])
    })

    test("doesn't run a failed task again", async () => {
        await sendQuestion("Hono or Express?")
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })
        await runFakeTasks().catch(() => {})

        const { waitingTasks } = await runFakeTasks()

        expect(waitingTasks).toEqual([])
        expect(fakeServer.requests).toHaveLength(1)
        expect(await listTaskStates()).toEqual(["failed"])
    })

    test("stops at a task that can't start, which stays pending", async () => {
        await sendQuestion("Hono or Express?")

        const failedRun = runReadyTasks(
            projectRoot,
            {},
            "aico run",
            (progress) => progresses.push(progress),
            developerCatalog,
        )

        await expect(failedRun).rejects.toThrow("which isn't set")
        await expect(failedRun).rejects.toThrow("stays pending")
        expect(await listTaskStates()).toEqual(["queued"])
    })
})
