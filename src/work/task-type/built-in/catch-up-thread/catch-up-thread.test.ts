import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createGitRepository } from "../../../../git/create-git-repository.ts"
import { recordEvent } from "../../../../journal/record-event.ts"
import {
    defineEventType,
    type JournalEvent,
} from "../../../../journal/schema.ts"
import { loadEvent } from "../../../../journal/storage.ts"
import { messageSentEventType } from "../../../../messaging/message/schema.ts"
import { sendMessage } from "../../../../messaging/message/send-message.ts"
import { createThread } from "../../../../messaging/thread/create-thread.ts"
import { createTemporaryCompany } from "../../../../organization/company/create-temporary-company.ts"
import type { Position } from "../../../../organization/position/schema.ts"
import { savePosition } from "../../../../organization/position/storage.ts"
import { createTask } from "../../../task/create-task.ts"
import { type Task, taskCompletedEventType } from "../../../task/schema.ts"
import { catchUpThreadTaskType } from "./catch-up-thread.ts"

const variableName = "LLMCO_CURRENT_HUMAN_ID"
const shellValue = process.env[variableName]
const position: Position = {
    id: "backend-developer",
    title: "Backend Developer",
    description: "",
}
let projectRoot: string
let threadId: string

beforeEach(async () => {
    delete process.env[variableName]
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, {
        name: "Omar Aboudou",
        email: "omar@example.com",
    })
    await savePosition(projectRoot, position)
    const { thread } = await createThread(projectRoot, { subject: "Stack" })
    threadId = thread.id
})

afterEach(async () => {
    if (shellValue === undefined) {
        delete process.env[variableName]
    } else {
        process.env[variableName] = shellValue
    }
    await rm(projectRoot, { recursive: true, force: true })
})

async function askDeveloper(question: string) {
    const body = `@backend-developer ${question}`
    const sending = await sendMessage(projectRoot, threadId, { body })
    const [catchUp] = sending.createdTasks
    if (catchUp === undefined) {
        throw new Error("Sending the question created no task")
    }
    return { messageId: sending.message.id, catchUp }
}

async function createCatchUp(causeEvent: JournalEvent): Promise<Task> {
    const uncreatedTask = {
        type: "catch-up-thread",
        positionId: position.id,
        params: { threadId },
    }
    return createTask(projectRoot, uncreatedTask, causeEvent)
}

async function completeCatchUp(task: Task, lastReadEntryId: string) {
    await recordEvent(projectRoot, taskCompletedEventType, {
        depth: 1,
        taskId: task.id,
        summary: "Answered.",
        lastReadEntryId,
    })
}

async function createSession(task: Task) {
    const causeEvent = await loadEvent(projectRoot, task.causeEventId)
    const ctx = { projectRoot, task, position, causeEvent }
    return catchUpThreadTaskType.createSession({ threadId }, ctx)
}

const remindedEventType = defineEventType({
    type: "test-reminded",
    description: "A test reminded a position of a thread.",
    fields: {},
})

describe("catch-up-thread", () => {
    test("runs on the thread's unread entries, with tools to answer", async () => {
        const question = await askDeveloper("Hono or Express?")
        const task = question.catchUp

        const session = await createSession(task)

        expect(session).toEqual({
            kind: "run",
            userMessage: expect.stringContaining('<message number="1"'),
            toolNames: ["message_send", "thread_show"],
            lastShownEntry: { threadId, entryId: question.messageId },
        })
    })

    test("gives only the entries after the position's read marker", async () => {
        const question = await askDeveloper("Hono or Express?")
        await completeCatchUp(question.catchUp, question.messageId)
        const followUp = await askDeveloper("And the database?")
        const secondTask = followUp.catchUp

        const session = await createSession(secondTask)

        expect(session).toMatchObject({
            kind: "run",
            userMessage: expect.stringContaining(
                "up to entry #1: thread_show shows earlier entries again",
            ),
        })
        expect(session).toMatchObject({
            userMessage: expect.not.stringContaining('<message number="1"'),
        })
    })

    test("completes at once when an earlier task read its cause", async () => {
        const question = await askDeveloper("Hono or Express?")
        const followUp = await askDeveloper("And the database?")
        await completeCatchUp(question.catchUp, followUp.messageId)
        const secondTask = followUp.catchUp

        const session = await createSession(secondTask)

        expect(session).toEqual({
            kind: "done",
            summary:
                "Already read: an earlier task read the thread up to entry #2.",
        })
    })

    test("completes at once when the asking message was never written", async () => {
        await askDeveloper("Hono or Express?")
        const unwrittenMessageSent = await recordEvent(
            projectRoot,
            messageSentEventType,
            {
                depth: 0,
                threadId,
                messageId: "20261018-140322-123-3f9a",
                mentions: [position.id],
            },
        )
        const task = await createCatchUp(unwrittenMessageSent)

        const session = await createSession(task)

        expect(session).toMatchObject({
            kind: "done",
            summary: expect.stringContaining("was never written"),
        })
    })

    test("completes at once when nothing is unread", async () => {
        const question = await askDeveloper("Hono or Express?")
        await completeCatchUp(question.catchUp, question.messageId)
        const remindedEvent = await recordEvent(
            projectRoot,
            remindedEventType,
            {
                depth: 0,
            },
        )
        const secondTask = await createCatchUp(remindedEvent)

        const session = await createSession(secondTask)

        expect(session).toEqual({
            kind: "done",
            summary:
                "Nothing new: the thread was read up to its last entry, #1.",
        })
    })
})
