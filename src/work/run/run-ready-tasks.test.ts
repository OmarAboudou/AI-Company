import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents } from "../../journal/storage.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.ts"
import { sendMessage } from "../../messaging/message/send-message.ts"
import { listMessages } from "../../messaging/message/storage.ts"
import { loadCompany, saveCompany } from "../../organization/company/storage.ts"
import { UserError } from "../../user-error.ts"
import { createCompanyWithLlmEmployee } from "../create-company-with-llm-employee.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import { listTasks } from "../task/storage.ts"
import { type RunReadyTasksProgress, runReadyTasks } from "./run-ready-tasks.ts"

const fakeServer = useFakeAnthropicServer()
const variableNames = ["LLMCO_CURRENT_HUMAN_ID", "TEST_ANTHROPIC_KEY"] as const
const shellValues = variableNames.map((name) => process.env[name])
let projectRoot: string
let threadId: string
let progresses: RunReadyTasksProgress[]

beforeEach(async () => {
    delete process.env.LLMCO_CURRENT_HUMAN_ID
    process.env.TEST_ANTHROPIC_KEY = "sk-test"
    const companyWithLlmEmployee = await createCompanyWithLlmEmployee(
        fakeServer.getUrl(),
    )
    projectRoot = companyWithLlmEmployee.projectRoot
    threadId = companyWithLlmEmployee.threadId
    progresses = []
})

afterEach(async () => {
    for (const [index, name] of variableNames.entries()) {
        const shellValue = shellValues[index]
        if (shellValue === undefined) {
            delete process.env[name]
        } else {
            process.env[name] = shellValue
        }
    }
    await rm(projectRoot, { recursive: true, force: true })
})

function runFakeTasks() {
    return runReadyTasks(projectRoot, (progress) => progresses.push(progress))
}

async function sendQuestion(body: string) {
    await sendMessage(projectRoot, threadId, { body })
}

async function listTaskStates() {
    const [tasks, events] = await Promise.all([
        listTasks(projectRoot),
        listEvents(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, events)
    return tasks.map(({ id }) => taskStates.get(id))
}

const completion = {
    name: "task_mark-as-done",
    input: { summary: "Answered: Hono." },
}

function createAnswer(body: string) {
    return { name: "message_send", input: { threadId, body } }
}

describe("runReadyTasks", () => {
    test("runs the task of a mentioned position an LLM works", async () => {
        await sendQuestion("@backend-developer Hono or Express?")
        fakeServer.respondWith({
            toolCalls: [createAnswer("@director Hono."), completion],
        })

        const { waitingTasks } = await runFakeTasks()

        const messages = await listMessages(projectRoot, threadId)
        expect(messages.map(({ body }) => body)).toEqual([
            "@backend-developer Hono or Express?",
            "@director Hono.",
        ])
        expect(await listTaskStates()).toEqual(["succeeded", "waiting"])
        expect(waitingTasks).toMatchObject([
            { positionId: "director", reason: "worked-by-directors" },
        ])
    })

    test("reports each task as it starts and ends", async () => {
        await sendQuestion("@backend-developer Hono or Express?")
        fakeServer.respondWith({ toolCalls: [completion] })

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
        await sendQuestion("@backend-developer Hono or Express?")
        const testRequest = createAnswer("@qa-tester Can you test Hono?")
        fakeServer.respondWith({ toolCalls: [testRequest, completion] })

        const { waitingTasks } = await runFakeTasks()

        expect(await listTaskStates()).toEqual(["succeeded", "waiting"])
        expect(waitingTasks).toMatchObject([
            { positionId: "qa-tester", reason: "vacant-position" },
        ])
    })

    test("reports a chain of tasks stopped at the company's maximum depth", async () => {
        const company = await loadCompany(projectRoot)
        await saveCompany(projectRoot, { ...company, maxTaskDepth: 1 })
        await sendQuestion("@backend-developer Hono or Express?")
        const testRequest = createAnswer("@qa-tester Can you test Hono?")
        fakeServer.respondWith({ toolCalls: [testRequest, completion] })

        const { waitingTasks } = await runFakeTasks()

        expect(progresses).toContainEqual({
            kind: "chain-stopped",
            chainStoppedEvent: expect.objectContaining({
                stoppedTask: expect.objectContaining({
                    positionId: "qa-tester",
                }),
            }),
        })
        expect(waitingTasks).toEqual([])
    })

    test("stops at an API error, then takes the task up again", async () => {
        await sendQuestion("@backend-developer Hono or Express?")
        fakeServer.respondWith(
            { status: 401, error: "invalid x-api-key" },
            { toolCalls: [completion] },
        )

        const failedRun = runFakeTasks()

        await expect(failedRun).rejects.toThrow(UserError)
        await expect(failedRun).rejects.toThrow("stays pending")
        expect(await listTaskStates()).toEqual(["running"])
        await runFakeTasks()
        expect(await listTaskStates()).toEqual(["succeeded"])
    })
})
