import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents } from "../../journal/storage.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.testing.ts"
import { sendMessage } from "../../messaging/message/send-message.ts"
import { listMessages } from "../../messaging/message/storage.ts"
import { UserError } from "../../user-error.ts"
import { createCompanyWithLlmEmployee } from "../create-company-with-llm-employee.testing.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import { listTasks } from "../task/storage.ts"
import type { WorkCatalog } from "../work-catalog.ts"
import { type RunReadyTasksProgress, runReadyTasks } from "./run-ready-tasks.ts"

const fakeServer = useFakeAnthropicServer()
const environment = { TEST_ANTHROPIC_KEY: "sk-test" }
const developerCatalog = createExampleWorkCatalog(["backend-developer"])
let projectRoot: string
let threadId: string
let progresses: RunReadyTasksProgress[]

beforeEach(async () => {
    const companyWithLlmEmployee = await createCompanyWithLlmEmployee(
        fakeServer.getUrl(),
    )
    projectRoot = companyWithLlmEmployee.projectRoot
    threadId = companyWithLlmEmployee.threadId
    progresses = []
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function runFakeTasks(catalog: WorkCatalog = developerCatalog) {
    return runReadyTasks(
        projectRoot,
        environment,
        (progress) => progresses.push(progress),
        catalog,
    )
}

async function sendQuestion(
    body: string,
    catalog: WorkCatalog = developerCatalog,
) {
    await sendMessage(projectRoot, environment, threadId, { body }, catalog)
}

async function listTaskStates() {
    const [tasks, events] = await Promise.all([
        listTasks(projectRoot),
        listEvents(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, events)
    return tasks.map(({ id }) => taskStates.get(id))
}

const markAsDoneCall = {
    name: "task_mark-as-done",
    input: { summary: "Answered: Hono." },
}

function createAnswer(body: string) {
    return { name: "message_send", input: { body } }
}

describe("runReadyTasks", () => {
    test("runs the task of a position an LLM works", async () => {
        await sendQuestion("Hono or Express?")
        fakeServer.respondWith({
            toolCalls: [createAnswer("Hono."), markAsDoneCall],
        })

        const { waitingTasks } = await runFakeTasks()

        const messages = await listMessages(projectRoot, threadId)
        expect(messages.map(({ body }) => body)).toEqual([
            "Hono or Express?",
            "Hono.",
        ])
        expect(await listTaskStates()).toEqual(["done"])
        expect(waitingTasks).toEqual([])
    })

    test("reports each task as it starts and ends", async () => {
        await sendQuestion("Hono or Express?")
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        await runFakeTasks()

        const kinds = progresses.map(({ kind }) => kind)
        expect(kinds).toEqual([
            "task-started",
            "tool-call",
            "tool-result",
            "task-ended",
        ])
    })

    test("runs the tasks its runs create, until none is ready", async () => {
        const catalog = createExampleWorkCatalog([
            "backend-developer",
            "director",
        ])
        await sendQuestion("Hono or Express?", catalog)
        const answer = createAnswer("Hono, for Bun.")
        fakeServer.respondWith({ toolCalls: [answer, markAsDoneCall] })

        const { waitingTasks } = await runFakeTasks(catalog)

        expect(await listTaskStates()).toEqual(["done", "waiting"])
        expect(waitingTasks).toMatchObject([
            { positionId: "director", reason: "worked-by-directors" },
        ])
    })

    test("stops at an API error, then takes the task up again", async () => {
        await sendQuestion("Hono or Express?")
        fakeServer.respondWith(
            { status: 401, error: "invalid x-api-key" },
            { toolCalls: [markAsDoneCall] },
        )

        const failedRun = runFakeTasks()

        await expect(failedRun).rejects.toThrow(UserError)
        await expect(failedRun).rejects.toThrow("stays pending")
        expect(await listTaskStates()).toEqual(["running"])
        await runFakeTasks()
        expect(await listTaskStates()).toEqual(["done"])
    })
})
