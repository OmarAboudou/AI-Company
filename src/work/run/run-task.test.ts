import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { EventType, JournalEvent } from "../../journal/schema.ts"
import { listEvents } from "../../journal/storage.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.testing.ts"
import { sendMessage } from "../../messaging/message/send-message.ts"
import { listMessages } from "../../messaging/message/storage.ts"
import type { LlmEmployee } from "../../organization/employee/schema.ts"
import { loadEmployee } from "../../organization/employee/storage.ts"
import type { Position } from "../../organization/position/schema.ts"
import { loadPosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { createCompanyWithLlmEmployee } from "../create-company-with-llm-employee.testing.ts"
import { createTask } from "../task/create-task.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import {
    type Task,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "../task/schema.ts"
import { runTask } from "./run-task.ts"

const fakeServer = useFakeAnthropicServer()
const environment = { TEST_ANTHROPIC_KEY: "sk-test" }
let projectRoot: string
let threadId: string
let questionId: string
let task: Task
let position: Position
let employee: LlmEmployee

async function createCatchUp(): Promise<Task> {
    const questionSent = (await listEvents(projectRoot)).at(0)
    if (questionSent === undefined) {
        throw new Error("Sending the question recorded no event")
    }
    const uncreatedTask = {
        type: "catch-up-thread",
        positionId: "backend-developer",
        params: { threadId },
    }
    return createTask(projectRoot, uncreatedTask, questionSent)
}

beforeEach(async () => {
    const companyWithLlmEmployee = await createCompanyWithLlmEmployee(
        fakeServer.getUrl(),
    )
    projectRoot = companyWithLlmEmployee.projectRoot
    threadId = companyWithLlmEmployee.threadId
    const body = "@backend-developer Hono or Express?"
    const { message } = await sendMessage(projectRoot, environment, threadId, {
        body,
    })
    questionId = message.id
    task = await createCatchUp()
    position = await loadPosition(projectRoot, "backend-developer")
    const claude = await loadEmployee(projectRoot, "claude")
    if (claude.kind !== "llm") {
        throw new Error("Claude isn't an LLM employee")
    }
    employee = claude
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function runFakeTask(
    taskToRun: Task = task,
    runEnvironment: NodeJS.ProcessEnv = environment,
) {
    const onProgress = () => {}
    return runTask(projectRoot, runEnvironment, {
        task: taskToRun,
        position,
        employee,
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
            employeeId: "claude",
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
                text: expect.stringContaining("Hono or Express?\n</message>"),
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
            "thread_show",
        ])
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

    test("records the last entry shown, when the run sends nothing", async () => {
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        await runFakeTask()

        expect(await findEvent(taskDoneEventType)).toMatchObject({
            lastReadEntryId: questionId,
        })
    })

    test("records the messages the run sent as read too", async () => {
        const answer = { threadId, body: "Hono, for Bun." }
        fakeServer.respondWith({
            toolCalls: [
                { name: "message_send", input: answer },
                markAsDoneCall,
            ],
        })

        await runFakeTask()

        const answerMessage = (await listMessages(projectRoot, threadId)).at(-1)
        expect(await findEvent(taskDoneEventType)).toMatchObject({
            lastReadEntryId: answerMessage?.id,
        })
    })

    test("records the task given up, with its reason", async () => {
        const reason = "The thread asks for figures I don't have."
        fakeServer.respondWith({
            toolCalls: [{ name: "task_mark-as-failed", input: { reason } }],
        })

        await runFakeTask()

        expect(await findEvent(taskFailedEventType)).toMatchObject({ reason })
    })

    test("marks as done a task whose cause was read, without a run", async () => {
        const readTask = await createCatchUp()
        await recordEvent(projectRoot, taskDoneEventType, {
            depth: 1,
            taskId: task.id,
            summary: "Answered: Hono, for Bun.",
            lastReadEntryId: questionId,
        })

        const result = await runFakeTask(readTask)

        const summary =
            "Already read: an earlier task read the thread up to entry #1."
        expect(result).toEqual({ taskEnding: { state: "done", summary } })
        expect(fakeServer.requests).toHaveLength(0)
        const events = await listEvents(projectRoot)
        const readTaskState = getTaskStates([readTask], events).get(readTask.id)
        expect(readTaskState).toBe("done")
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
            `Task "${task.id}" is of type "review-code", which this version of llmco doesn't know`,
        )
    })

    test("refuses a task whose type rejects its parameters", async () => {
        const invalidTask = { ...task, params: { threadId: 42 } }

        const running = runFakeTask(invalidTask)

        await expect(running).rejects.toThrow(
            `Invalid .llmco/tasks/${task.id}.json`,
        )
    })
})
