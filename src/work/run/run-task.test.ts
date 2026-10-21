import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents } from "../../journal/storage.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import type { LlmEmployee } from "../../organization/employee/schema.ts"
import { loadEmployee } from "../../organization/employee/storage.ts"
import type { Position } from "../../organization/position/schema.ts"
import { loadPosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { createAnsweringCompany } from "../create-answering-company.ts"
import { createTask } from "../task/create-task.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import type { Task } from "../task/schema.ts"
import { builtInTools } from "../tool/built-in/built-in.ts"
import { runTask } from "./run-task.ts"

const fakeServer = useFakeAnthropicServer()
const variableNames = ["LLMCO_CURRENT_HUMAN_ID", "TEST_ANTHROPIC_KEY"] as const
const shellValues = variableNames.map((name) => process.env[name])
let projectRoot: string
let task: Task
let position: Position
let employee: LlmEmployee

beforeEach(async () => {
    delete process.env.LLMCO_CURRENT_HUMAN_ID
    process.env.TEST_ANTHROPIC_KEY = "sk-test"
    const answeringCompany = await createAnsweringCompany(fakeServer.getUrl())
    projectRoot = answeringCompany.projectRoot
    const questionSent = await recordEvent(projectRoot, messageSentEventType, {
        depth: 0,
        threadId: answeringCompany.threadId,
        messageId: "20261018-140322-123-3f9a",
        mentions: ["backend-developer"],
    })
    const newTask = {
        type: "catch-up-thread",
        positionId: "backend-developer",
        params: { threadId: answeringCompany.threadId },
    }
    task = await createTask(projectRoot, newTask, questionSent)
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

function runFakeTask() {
    return runTask(projectRoot, {
        task,
        position,
        employee,
        systemPrompt: "You are Claude Senior.",
        userMessage: "Catch up on the thread.",
        tools: builtInTools,
        onProgress: () => {},
    })
}

async function listEventsOfRun(runId: string) {
    const events = await listEvents(projectRoot)
    return events.filter((event) => "runId" in event && event.runId === runId)
}

const completion = {
    name: "task_complete",
    input: { summary: "Answered: Hono, for Bun." },
}

describe("runTask", () => {
    test("records the run's start, by its employee with its model", async () => {
        fakeServer.respondWith({ toolCalls: [completion] })

        const { runId } = await runFakeTask()

        const [runStart] = await listEventsOfRun(runId)
        expect(runStart).toMatchObject({
            type: "task-started",
            depth: 1,
            taskId: task.id,
            employeeId: "claude",
            model: { providerId: "anthropic", modelId: "opus" },
        })
    })

    test("records the task completed, with the tokens the run used", async () => {
        fakeServer.respondWith({ toolCalls: [completion] })

        const { runId } = await runFakeTask()

        const events = await listEvents(projectRoot)
        const runEnd = (await listEventsOfRun(runId)).at(-1)
        expect(runEnd).toMatchObject({
            type: "task-completed",
            depth: 1,
            taskId: task.id,
            summary: "Answered: Hono, for Bun.",
            usage: {
                inputTokens: 10,
                outputTokens: 5,
                cacheReadInputTokens: 100,
                cacheCreationInputTokens: 20,
            },
        })
        expect(getTaskStates([task], events).get(task.id)).toBe("succeeded")
    })

    test("records the task given up, with its reason", async () => {
        const reason = "The thread asks for figures I don't have."
        fakeServer.respondWith({
            toolCalls: [{ name: "task_fail", input: { reason } }],
        })

        const { runId } = await runFakeTask()

        const runEnd = (await listEventsOfRun(runId)).at(-1)
        expect(runEnd).toMatchObject({ type: "task-failed", reason })
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
})
