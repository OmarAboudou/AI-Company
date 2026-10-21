import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createGitRepository } from "../../../../git/create-git-repository.testing.ts"
import { recordEvent } from "../../../../journal/record-event.ts"
import { requireJournalEvent } from "../../../../journal/require-journal-event.ts"
import {
    defineEventType,
    type JournalEvent,
} from "../../../../journal/schema.ts"
import { loadJournal } from "../../../../journal/storage.ts"
import { createUnsentMessage } from "../../../../messaging/message/create-unsent-message.ts"
import { messageSentEventType } from "../../../../messaging/message/schema.ts"
import { sendMessage } from "../../../../messaging/message/send-message.ts"
import { sendUnsentMessage } from "../../../../messaging/message/send-unsent-message.ts"
import { createThread } from "../../../../messaging/thread/create-thread.ts"
import { createTemporaryCompany } from "../../../../organization/company/create-temporary-company.testing.ts"
import type { Position } from "../../../../organization/position/schema.ts"
import { savePosition } from "../../../../organization/position/storage.ts"
import { createTask } from "../../../task/create-task.ts"
import { type Task, taskDoneEventType } from "../../../task/schema.ts"
import { catchUpThreadTaskType } from "./catch-up-thread.ts"

const position: Position = {
    id: "backend-developer",
    title: "Backend Developer",
    description: "",
}
let environment: NodeJS.ProcessEnv
let projectRoot: string
let threadId: string

beforeEach(async () => {
    environment = {}
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, {
        name: "Omar Aboudou",
        email: "omar@example.com",
    })
    await savePosition(projectRoot, position)
    const { thread } = await createThread(projectRoot, environment, {
        subject: "Stack",
    })
    threadId = thread.id
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function askDeveloper(question: string) {
    const body = `@backend-developer ${question}`
    const sending = await sendMessage(projectRoot, environment, threadId, {
        body,
    })
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
    return createTask(await loadJournal(projectRoot), uncreatedTask, causeEvent)
}

async function markCatchUpAsDone(task: Task, lastReadEntryId: string) {
    await recordEvent(await loadJournal(projectRoot), taskDoneEventType, {
        depth: 1,
        taskId: task.id,
        summary: "Answered.",
        result: { lastReadEntryId },
    })
}

async function loadContext(task: Task) {
    const journal = await loadJournal(projectRoot)
    const causeEvent = requireJournalEvent(journal, task.causeEventId)
    return { projectRoot, journal, task, position, causeEvent }
}

async function createSession(task: Task) {
    const ctx = await loadContext(task)
    return catchUpThreadTaskType.createSession({ threadId }, ctx)
}

const remindedEventType = defineEventType({
    type: "test-reminded",
    description: "A test reminded a position of a thread.",
    fields: {},
})

describe("catch-up-thread", () => {
    test("runs on the thread's unread entries, with tools to answer in it", async () => {
        const question = await askDeveloper("Hono or Express?")
        const task = question.catchUp

        const session = await createSession(task)

        expect(session).toEqual({
            kind: "run",
            userMessage: expect.stringContaining('<message number="1"'),
            toolNames: ["message_send", "thread_show"],
            boundToolInputs: {
                message_send: { threadId },
                thread_show: { threadId },
            },
            result: { lastReadEntryId: question.messageId },
        })
    })

    test("gives only the entries after the position's read marker", async () => {
        const question = await askDeveloper("Hono or Express?")
        await markCatchUpAsDone(question.catchUp, question.messageId)
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

    test("is done at once when an earlier task read its cause", async () => {
        const question = await askDeveloper("Hono or Express?")
        const followUp = await askDeveloper("And the database?")
        await markCatchUpAsDone(question.catchUp, followUp.messageId)
        const secondTask = followUp.catchUp

        const session = await createSession(secondTask)

        expect(session).toEqual({
            kind: "done",
            summary:
                "Already read: an earlier task read the thread up to entry #2.",
            result: {},
        })
    })

    test("is done at once when the asking message was never written", async () => {
        await askDeveloper("Hono or Express?")
        const unwrittenMessageSent = await recordEvent(
            await loadJournal(projectRoot),
            messageSentEventType,
            {
                depth: 0,
                threadId,
                messageId: "20261018-140322-123-3f9a",
                positionId: "director",
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

    test("is done at once when nothing is unread", async () => {
        const question = await askDeveloper("Hono or Express?")
        await markCatchUpAsDone(question.catchUp, question.messageId)
        const remindedEvent = await recordEvent(
            await loadJournal(projectRoot),
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
            result: {},
        })
    })

    test("is done, after a run, up to the entry shown and the run's own messages", async () => {
        const question = await askDeveloper("Hono or Express?")
        const runId = "20261018-140324-000-1b2c"
        const author = {
            position: { id: position.id, title: position.title },
            committer: { name: "Omar Aboudou", email: "omar@example.com" },
        }
        const unsentAnswer = await createUnsentMessage(
            projectRoot,
            author,
            "Hono, for Bun.",
        )
        const answer = await sendUnsentMessage(
            await loadJournal(projectRoot),
            threadId,
            unsentAnswer,
            { depth: 1, runId },
        )
        const ctx = await loadContext(question.catchUp)

        const result = await catchUpThreadTaskType.getRunResult?.(
            { threadId },
            { runId, sessionResult: { lastReadEntryId: question.messageId } },
            ctx,
        )

        expect(result).toEqual({ lastReadEntryId: answer.id })
    })
})
