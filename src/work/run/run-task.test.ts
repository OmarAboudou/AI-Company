import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { EventType, JournalEvent } from "../../journal/schema.ts"
import { listEvents } from "../../journal/storage.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.ts"
import { sendMessage } from "../../messaging/message/send-message.ts"
import { listMessages } from "../../messaging/message/storage.ts"
import type { LlmEmployee } from "../../organization/employee/schema.ts"
import { loadEmployee } from "../../organization/employee/storage.ts"
import type { Position } from "../../organization/position/schema.ts"
import { loadPosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { createAnsweringCompany } from "../create-answering-company.ts"
import { createTask } from "../task/create-task.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import {
    type Task,
    taskCompletedEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "../task/schema.ts"
import { runTask } from "./run-task.ts"

const fakeServer = useFakeAnthropicServer()
const variableNames = ["LLMCO_CURRENT_HUMAN_ID", "TEST_ANTHROPIC_KEY"] as const
const shellValues = variableNames.map((name) => process.env[name])
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
    const newTask = {
        type: "catch-up-thread",
        positionId: "backend-developer",
        params: { threadId },
    }
    return createTask(projectRoot, newTask, questionSent)
}

beforeEach(async () => {
    delete process.env.LLMCO_CURRENT_HUMAN_ID
    process.env.TEST_ANTHROPIC_KEY = "sk-test"
    const answeringCompany = await createAnsweringCompany(fakeServer.getUrl())
    projectRoot = answeringCompany.projectRoot
    threadId = answeringCompany.threadId
    const body = "@backend-developer Hono or Express?"
    const { message } = await sendMessage(projectRoot, threadId, { body })
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

function runFakeTask(taskToRun: Task = task) {
    const onProgress = () => {}
    return runTask(projectRoot, {
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

const completion = {
    name: "task_complete",
    input: { summary: "Answered: Hono, for Bun." },
}

describe("runTask", () => {
    test("records the run's start, by its employee with its model", async () => {
        fakeServer.respondWith({ toolCalls: [completion] })

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
        fakeServer.respondWith({ toolCalls: [completion] })

        await runFakeTask()

        const body = fakeServer.requests[0]?.body
        const identityLine = "You are Claude Senior, backend-developer at Acme."
        expect(body?.system[0]?.text).toStartWith(identityLine)
        expect(body?.messages[0]?.content).toMatchObject([
            {
                type: "text",
                text: expect.stringContaining("Hono or Express?\n</message>"),
            },
        ])
    })

    test("gives the task type's tools, and those that end the task", async () => {
        fakeServer.respondWith({ toolCalls: [completion] })

        await runFakeTask()

        const tools = fakeServer.requests[0]?.body.tools ?? []
        expect(tools.map(({ name }) => name)).toEqual([
            "message_send",
            "task_complete",
            "task_fail",
            "thread_show",
        ])
    })

    test("records the task completed, with the tokens the run used", async () => {
        fakeServer.respondWith({ toolCalls: [completion] })

        const { run } = await runFakeTask()

        expect(await findEvent(taskCompletedEventType)).toMatchObject({
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
        expect(getTaskStates([task], events).get(task.id)).toBe("succeeded")
    })

    test("records the last entry shown, when the run sends nothing", async () => {
        fakeServer.respondWith({ toolCalls: [completion] })

        await runFakeTask()

        expect(await findEvent(taskCompletedEventType)).toMatchObject({
            lastReadEntryId: questionId,
        })
    })

    test("records the messages the run sent as read too", async () => {
        const answer = { threadId, body: "Hono, for Bun." }
        fakeServer.respondWith({
            toolCalls: [{ name: "message_send", input: answer }, completion],
        })

        await runFakeTask()

        const answerMessage = (await listMessages(projectRoot, threadId)).at(-1)
        expect(await findEvent(taskCompletedEventType)).toMatchObject({
            lastReadEntryId: answerMessage?.id,
        })
    })

    test("records the task given up, with its reason", async () => {
        const reason = "The thread asks for figures I don't have."
        fakeServer.respondWith({
            toolCalls: [{ name: "task_fail", input: { reason } }],
        })

        await runFakeTask()

        expect(await findEvent(taskFailedEventType)).toMatchObject({ reason })
    })

    test("completes a task whose cause was read, without a run", async () => {
        const readTask = await createCatchUp()
        await recordEvent(projectRoot, taskCompletedEventType, {
            depth: 1,
            taskId: task.id,
            summary: "Answered: Hono, for Bun.",
            lastReadEntryId: questionId,
        })

        const result = await runFakeTask(readTask)

        const summary =
            "Already read: an earlier task read the thread up to entry #1."
        expect(result).toEqual({ taskEnding: { state: "succeeded", summary } })
        expect(fakeServer.requests).toHaveLength(0)
        const events = await listEvents(projectRoot)
        const readTaskState = getTaskStates([readTask], events).get(readTask.id)
        expect(readTaskState).toBe("succeeded")
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
        delete process.env.TEST_ANTHROPIC_KEY
        const eventsBefore = await listEvents(projectRoot)

        const running = runFakeTask()

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
