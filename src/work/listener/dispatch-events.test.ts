import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { recordEvent } from "../../journal/record-event.ts"
import { saveEvent } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { listTasks } from "../task/storage.ts"
import { catchUpListener } from "./catch-up-listener.ts"
import { defineListener } from "./define-listener.ts"
import { dispatchEvents } from "./dispatch-events.ts"
import { loadDispatchedEventIds } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const threadId = "2026-10-18-choice-of-framework"

async function createMessageSentEvent(mentions: string[], depth = 0) {
    return recordEvent(projectRoot, messageSentEventType, {
        depth,
        threadId,
        messageId: "20261018-140322-123-3f9a",
        positionId: "director",
        mentions,
    })
}

const reviewListener = defineListener({
    eventType: messageSentEventType,
    getEffects: ({ threadId }) => [
        {
            kind: "create-task",
            task: {
                type: "review-thread",
                positionId: "qa-tester",
                params: { threadId },
            },
        },
    ],
})

function dispatchToCatchUpListener() {
    return dispatchEvents(projectRoot, [catchUpListener])
}

describe("dispatchEvents", () => {
    test("applies the effects that listeners return", async () => {
        const questionSent = await createMessageSentEvent(["backend-developer"])

        const { createdTasks } = await dispatchToCatchUpListener()

        expect(createdTasks).toMatchObject([
            {
                type: "catch-up-thread",
                positionId: "backend-developer",
                causeEventId: questionSent.id,
            },
        ])
        expect(await listTasks(projectRoot)).toEqual(createdTasks)
    })

    test("gives each event to every listener subscribed to it", async () => {
        await createMessageSentEvent(["backend-developer"])
        const listeners = [catchUpListener, reviewListener]

        const { createdTasks } = await dispatchEvents(projectRoot, listeners)

        const taskTypes = createdTasks.map(({ type }) => type)
        expect(taskTypes).toEqual(["catch-up-thread", "review-thread"])
    })

    test("remembers the events it gave, even those that ask nothing", async () => {
        const questionSent = await createMessageSentEvent(["backend-developer"])
        const noteSent = await createMessageSentEvent([])

        await dispatchToCatchUpListener()

        const dispatchedEventIds = await loadDispatchedEventIds(projectRoot)
        const eventIds = new Set([questionSent.id, noteSent.id])
        expect(dispatchedEventIds).toEqual(eventIds)
    })

    test("gives an event only once", async () => {
        await createMessageSentEvent(["backend-developer"])
        await dispatchToCatchUpListener()
        const answerSent = await createMessageSentEvent(["director"], 1)

        const { createdTasks } = await dispatchToCatchUpListener()

        expect(createdTasks).toMatchObject([{ causeEventId: answerSent.id }])
        expect(await listTasks(projectRoot)).toHaveLength(2)
    })

    test("creates nothing twice, even on a machine giving events again", async () => {
        await createMessageSentEvent(["backend-developer"])
        await dispatchToCatchUpListener()
        await rm(join(projectRoot, ".llmco", ".state"), { recursive: true })

        const { createdTasks } = await dispatchToCatchUpListener()

        expect(createdTasks).toEqual([])
        expect(await listTasks(projectRoot)).toHaveLength(1)
    })

    test("passes over an event of a type no listener handles", async () => {
        const threadClosed = {
            id: "20261018-150000-000-9e3f",
            type: "thread-closed",
            occurredAt: "2026-10-18T15:00:00.000Z",
            depth: 0,
            threadId,
        }
        await saveEvent(projectRoot, threadClosed)

        const { createdTasks } = await dispatchToCatchUpListener()

        const dispatchedEventIds = await loadDispatchedEventIds(projectRoot)
        expect(createdTasks).toEqual([])
        expect(dispatchedEventIds).toEqual(new Set([threadClosed.id]))
    })
})
