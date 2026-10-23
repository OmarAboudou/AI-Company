import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { EventType, JournalEvent } from "../../journal/schema.ts"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.testing.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import type { Employee } from "../../organization/employee/schema.ts"
import { loadEmployee } from "../../organization/employee/storage.ts"
import type { Position } from "../../organization/position/schema.ts"
import { loadPosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { createCompanyWithLlmEmployee } from "../create-company-with-llm-employee.testing.ts"
import {
    createExampleWorkCatalog,
    exampleTaskType,
} from "../create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../send-example-message.testing.ts"
import { createTask } from "../task/create-task.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import {
    type Task,
    taskCancelledEventType,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "../task/schema.ts"
import { createUncreatedTask } from "../task-type/create-uncreated-task.ts"
import { runTask } from "./run-task.ts"

const fakeServer = useFakeAnthropicServer()
const environment = { TEST_ANTHROPIC_KEY: "sk-test" }
const exampleCatalog = createExampleWorkCatalog(["backend-developer"])
let projectRoot: string
let ticketNumber: number
let task: Task
let position: Position
let employee: Employee

async function askDeveloper(body: string) {
    const sending = await sendExampleMessage(
        projectRoot,
        ticketNumber,
        body,
        exampleCatalog,
    )
    const [exampleTask] = sending.createdTasks
    if (exampleTask === undefined) {
        throw new Error("Asking the developer created no task")
    }
    return exampleTask
}

beforeEach(async () => {
    const companyWithLlmEmployee = await createCompanyWithLlmEmployee(
        fakeServer.getUrl(),
    )
    projectRoot = companyWithLlmEmployee.projectRoot
    ticketNumber = companyWithLlmEmployee.ticketNumber
    task = await askDeveloper("Hono or Express?")
    position = await loadPosition(projectRoot, "backend-developer")
    employee = await loadEmployee(projectRoot, "claude")
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function runFakeTask(
    taskToRun: Task = task,
    runEnvironment: NodeJS.ProcessEnv = environment,
) {
    const onProgress = () => {}
    return runTask(await loadJournal(projectRoot), runEnvironment, {
        task: taskToRun,
        position,
        employee,
        taskTypes: exampleCatalog.taskTypes,
        operationName: "aico run",
        onProgress,
    })
}

async function findEvent<Content extends Omit<JournalEvent, "id">>(
    eventType: EventType<Content>,
) {
    const events = await listEvents(projectRoot)
    return events.map((event) => getEventOfType(event, eventType)).find(Boolean)
}

const markAsDoneCall = {
    name: "task_mark-as-done",
    input: { summary: "Answered: Hono, for Bun." },
}

describe("runTask", () => {
    test("records the run's start, by its employee with its model", async () => {
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        const { run } = await runFakeTask()

        expect(await findEvent(taskStartedEventType)).toMatchObject({
            depth: 1,
            taskId: task.id,
            runId: run?.runId,
            worker: { kind: "employee", employeeId: "claude" },
            model: { providerId: "anthropic", modelId: "opus" },
        })
    })

    test("gives the runs' system prompt and the task's user message", async () => {
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        await runFakeTask()

        const body = fakeServer.requests[0]?.body
        const identityLine =
            "You are Claude Senior, backend-developer (@backend-developer) at Acme."
        expect(body?.system[0]?.text).toStartWith(identityLine)
        expect(body?.messages[0]?.content).toMatchObject([
            {
                type: "text",
                text: `Answer the last message of ticket #${ticketNumber}.`,
            },
        ])
    })

    test("gives the task type's tools, and those that end the task", async () => {
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        await runFakeTask()

        const tools = fakeServer.requests[0]?.body.tools ?? []
        expect(tools.map(({ name }) => name)).toEqual([
            "message_send",
            "task_mark-as-done",
            "task_mark-as-failed",
            "ticket_show",
        ])
    })

    test("fixes the ticket of the tools its type fixes", async () => {
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        await runFakeTask()

        const tools = fakeServer.requests[0]?.body.tools ?? []
        const sendingTool = tools.find(({ name }) => name === "message_send")
        expect(sendingTool?.description).toStartWith(
            "Send a message in this ticket's discussion,",
        )
        expect(sendingTool?.input_schema.properties).toEqual({
            body: {
                type: "string",
                description: "The message, in Markdown.",
                contentMediaType: "text/markdown",
            },
        })
    })

    test("records the task done, with the tokens the run used", async () => {
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        const { run } = await runFakeTask()

        expect(await findEvent(taskDoneEventType)).toMatchObject({
            depth: 1,
            taskId: task.id,
            runId: run?.runId,
            summary: "Answered: Hono, for Bun.",
            usage: {
                inputTokens: 10,
                outputTokens: 5,
                cacheReadInputTokens: 100,
                cacheCreationInputTokens: 20,
            },
        })
        const events = await listEvents(projectRoot)
        expect(getTaskStates([task], events).get(task.id)).toBe("done")
    })

    test("records as its result what the task's type makes of the run", async () => {
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        const { run } = await runFakeTask()

        expect(await findEvent(taskDoneEventType)).toMatchObject({
            result: { runId: run?.runId },
        })
    })

    test("records the task given up, with its reason", async () => {
        const reason = "The ticket asks for figures I don't have."
        fakeServer.respondWith({
            toolCalls: [{ name: "task_mark-as-failed", input: { reason } }],
        })

        await runFakeTask()

        expect(await findEvent(taskFailedEventType)).toMatchObject({ reason })
    })

    test("marks as done, without a run, a task its type finds done", async () => {
        const journal = await loadJournal(projectRoot)
        const questionSent = await recordEvent(journal, messageSentEventType, {
            depth: 0,
            ticketNumber,
            messageId: "20261018-140322-123-3f9a",
            positionId: "director",
        })
        const summary = "Already answered."
        const answeredTask = await createTask(
            journal,
            createUncreatedTask(exampleTaskType, {
                positionId: "backend-developer",
                params: { ticketNumber, doneSummary: summary },
            }),
            questionSent,
        )

        const result = await runFakeTask(answeredTask)

        expect(result).toEqual({ taskEnding: { state: "done", summary } })
        expect(fakeServer.requests).toHaveLength(0)
        const events = await listEvents(projectRoot)
        const answeredTaskState = getTaskStates([answeredTask], events).get(
            answeredTask.id,
        )
        expect(answeredTaskState).toBe("done")
    })

    test("cancels, without a run, a task that became pointless before it started", async () => {
        await sendExampleMessage(
            projectRoot,
            ticketNumber,
            "Stop.",
            createExampleWorkCatalog(),
        )

        const result = await runFakeTask()

        const reason = `Ticket #${ticketNumber}'s discussion says Stop.`
        expect(result).toEqual({ taskEnding: { state: "cancelled", reason } })
        expect(fakeServer.requests).toHaveLength(0)
        expect(await findEvent(taskCancelledEventType)).toMatchObject({
            depth: 1,
            taskId: task.id,
            reason,
        })
    })

    test("leaves the task running when the provider's API fails", async () => {
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })

        const running = runFakeTask()

        await expect(running).rejects.toThrow(UserError)
        const events = await listEvents(projectRoot)
        expect(events.at(-1)?.type).toBe("task-started")
        expect(getTaskStates([task], events).get(task.id)).toBe("running")
    })

    test("starts nothing without the provider's key", async () => {
        const eventsBefore = await listEvents(projectRoot)

        const running = runFakeTask(task, {})

        await expect(running).rejects.toThrow("which isn't set")
        expect(await listEvents(projectRoot)).toEqual(eventsBefore)
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("refuses a task of a type it doesn't know", async () => {
        const reviewTask = { ...task, type: "review-code" }

        const running = runFakeTask(reviewTask)

        await expect(running).rejects.toThrow(
            `Task "${task.id}" is of type "review-code", which this version of AICo doesn't know`,
        )
    })

    test("refuses a task whose type rejects its parameters", async () => {
        const invalidTask = { ...task, params: { ticketNumber: "1" } }

        const running = runFakeTask(invalidTask)

        await expect(running).rejects.toThrow(
            `Invalid .aico/tasks/${task.id}.json`,
        )
    })
})
