import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { runGit } from "../../git/run-git.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.testing.ts"
import { listMessages } from "../../messaging/message/storage.ts"
import { assignPosition } from "../../organization/position/assign-position.ts"
import { createCompanyWithLlmEmployee } from "../create-company-with-llm-employee.testing.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
import { relaunchCompany } from "../pause/relaunch-company.ts"
import { sendExampleMessage } from "../send-example-message.testing.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import { type Task, taskStartedEventType } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"
import type { WorkCatalog } from "../work-catalog.ts"
import {
    type ReadyTasksRunning,
    type RunReadyTasksProgress,
    runReadyTasks,
} from "./run-ready-tasks.ts"
import { startRun } from "./start/start-run.ts"

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

function runFakeTasks({
    catalog = developerCatalog,
    signal,
}: ReadyTasksRunning = {}) {
    return runReadyTasks(
        projectRoot,
        environment,
        "aico run",
        (progress) => progresses.push(progress),
        { catalog, signal },
    )
}

async function startTaskElsewhere(processId: number): Promise<Task> {
    await sendQuestion("Hono or Express?")
    const [task] = await listTasks(projectRoot)
    if (task === undefined) {
        throw new Error("Asking the developer created no task")
    }
    const runId = "20261023-140324-000-1b2c"
    await startRun(projectRoot, {
        id: runId,
        processId,
        systemPrompt: "You are Claude Senior.",
        tools: [],
        userMessage: "Answer the last message of ticket #1.",
        session: { toolNames: [], result: {} },
    })
    await recordEvent(await loadJournal(projectRoot), taskStartedEventType, {
        depth: 1,
        taskId: task.id,
        runId,
        worker: { kind: "employee", employeeId: "claude" },
    })
    return task
}

async function askBothDevelopers(): Promise<WorkCatalog> {
    await assignPosition(projectRoot, "qa-tester", "julie")
    const catalog = createExampleWorkCatalog(["backend-developer", "qa-tester"])
    await sendQuestion("Hono or Express?", catalog)
    return catalog
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

        const result = await runFakeTasks()

        const messages = await listMessages(projectRoot, ticketNumber)
        expect(messages.map(({ body }) => body)).toEqual([
            "Hono or Express?",
            "Hono.",
        ])
        expect(await listTaskStates()).toEqual(["done"])
        expect(result).toEqual({
            kind: "none-ready",
            waitingTasks: [],
            pause: undefined,
        })
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

        const result = await runFakeTasks({ catalog })

        expect(await listTaskStates()).toEqual(["done", "queued"])
        expect(result).toMatchObject({
            kind: "none-ready",
            waitingTasks: [{ positionId: "director", reason: "held-by-user" }],
        })
    })

    test("pauses the company at a task that failed, before the next one", async () => {
        const catalog = await askBothDevelopers()
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })

        const result = await runFakeTasks({ catalog })

        const [failedTask] = await listTasks(projectRoot)
        expect(await listTaskStates()).toEqual(["failed", "queued"])
        expect(result).toMatchObject({
            kind: "none-ready",
            waitingTasks: [{ positionId: "qa-tester", reason: "paused" }],
            pause: { cause: { kind: "failure", taskId: failedTask?.id } },
        })
    })

    test("doesn't run a failed task again, once relaunched", async () => {
        await sendQuestion("Hono or Express?")
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })
        await runFakeTasks()
        await relaunchCompany(await loadJournal(projectRoot))

        const result = await runFakeTasks()

        expect(result).toEqual({
            kind: "none-ready",
            waitingTasks: [],
            pause: undefined,
        })
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
            { catalog: developerCatalog },
        )

        await expect(failedRun).rejects.toThrow("which isn't set")
        await expect(failedRun).rejects.toThrow("stays pending")
        expect(await listTaskStates()).toEqual(["queued"])
    })

    test("stops once asked, failing the task in progress, before the next one", async () => {
        const catalog = await askBothDevelopers()
        const controller = new AbortController()

        const result = await runReadyTasks(
            projectRoot,
            environment,
            "aico run",
            ({ kind }) => {
                if (kind === "task-started") {
                    controller.abort()
                }
            },
            { catalog, signal: controller.signal },
        )

        expect(result).toEqual({ kind: "stopped" })
        expect(await listTaskStates()).toEqual(["failed", "queued"])
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("starts no task once asked to stop", async () => {
        await sendQuestion("Hono or Express?")

        const result = await runFakeTasks({ signal: AbortSignal.abort() })

        expect(result).toEqual({ kind: "stopped" })
        expect(await listTaskStates()).toEqual(["queued"])
    })

    test("fails first the tasks whose process stopped short, which pauses the company", async () => {
        const task = await startTaskElsewhere(Bun.spawnSync(["true"]).pid)

        const result = await runFakeTasks()

        expect(progresses).toEqual([{ kind: "task-cut-short", task }])
        expect(await listTaskStates()).toEqual(["failed"])
        expect(result).toMatchObject({
            pause: { cause: { kind: "failure", taskId: task.id } },
        })
    })

    test("leaves a task that another process runs", async () => {
        await startTaskElsewhere(process.ppid)

        const result = await runFakeTasks()

        expect(result).toMatchObject({
            kind: "none-ready",
            waitingTasks: [{ reason: "running" }],
        })
        expect(fakeServer.requests).toHaveLength(0)
    })
})
