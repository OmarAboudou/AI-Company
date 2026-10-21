import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { recordEvent } from "../../journal/record-event.ts"
import { type EventOfType, messageSentEventType } from "../../journal/schema.ts"
import { listEvents, saveEvent } from "../../journal/storage.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import { loadCompany, saveCompany } from "../../organization/company/storage.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { listTasks, saveTask } from "../task/storage.ts"
import { defineListener } from "./define-listener.ts"
import { dispatchEvents } from "./dispatch-events.ts"
import { mentionListener } from "./mention-listener.ts"
import { loadDispatchedEventIds } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const threadId = "2026-10-18-choice-of-framework"

type MessageSentEvent = EventOfType<typeof messageSentEventType>

async function createMessageSentEvent(mentions: string[], depth = 0) {
    return recordEvent(projectRoot, messageSentEventType, {
        depth,
        threadId,
        messageId: "20261018-140322-123-3f9a",
        mentions,
    })
}

const reviewListener = defineListener({
    eventType: messageSentEventType,
    getNewTasks: ({ threadId }) => [
        {
            type: "review-thread",
            positionId: "qa-tester",
            params: { threadId },
        },
    ],
})

function dispatchToMentionListener() {
    return dispatchEvents(projectRoot, [mentionListener])
}

describe("dispatchEvents", () => {
    test("creates the tasks that listeners return, a step deeper", async () => {
        const questionSent = await createMessageSentEvent(["backend-developer"])

        const { createdTasks } = await dispatchToMentionListener()

        expect(createdTasks).toMatchObject([
            {
                type: "catch-up-thread",
                params: { threadId },
                positionId: "backend-developer",
                depth: 1,
                causeEventId: questionSent.id,
            },
        ])
        expect(await listTasks(projectRoot)).toEqual(createdTasks)
    })

    test("gives each event to every listener subscribed to it", async () => {
        await createMessageSentEvent(["backend-developer"])
        const listeners = [mentionListener, reviewListener]

        const { createdTasks } = await dispatchEvents(projectRoot, listeners)

        const taskTypes = createdTasks.map(({ type }) => type)
        expect(taskTypes).toEqual(["catch-up-thread", "review-thread"])
    })

    test("remembers the events it gave, even those that ask nothing", async () => {
        const questionSent = await createMessageSentEvent(["backend-developer"])
        const noteSent = await createMessageSentEvent([])

        await dispatchToMentionListener()

        const dispatchedEventIds = await loadDispatchedEventIds(projectRoot)
        const eventIds = new Set([questionSent.id, noteSent.id])
        expect(dispatchedEventIds).toEqual(eventIds)
    })

    test("gives an event only once", async () => {
        await createMessageSentEvent(["backend-developer"])
        await dispatchToMentionListener()
        const answerSent = await createMessageSentEvent(["director"], 1)

        const { createdTasks } = await dispatchToMentionListener()

        expect(createdTasks).toMatchObject([{ causeEventId: answerSent.id }])
        expect(await listTasks(projectRoot)).toHaveLength(2)
    })

    test("never creates a task twice, even on a machine giving events again", async () => {
        await createMessageSentEvent(["backend-developer"])
        await dispatchToMentionListener()
        await rm(join(projectRoot, ".llmco", ".state"), { recursive: true })

        const { createdTasks } = await dispatchToMentionListener()

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

        const { createdTasks } = await dispatchToMentionListener()

        const dispatchedEventIds = await loadDispatchedEventIds(projectRoot)
        expect(createdTasks).toEqual([])
        expect(dispatchedEventIds).toEqual(new Set([threadClosed.id]))
    })
})

describe("dispatchEvents at the end of a chain", () => {
    async function setMaxTaskDepth(maxTaskDepth: number) {
        const company = await loadCompany(projectRoot)
        await saveCompany(projectRoot, { ...company, maxTaskDepth })
    }

    test("creates tasks up to the company's maximum depth", async () => {
        await setMaxTaskDepth(2)
        await createMessageSentEvent(["qa-tester"], 1)

        const { createdTasks } = await dispatchToMentionListener()

        expect(createdTasks).toMatchObject([{ depth: 2 }])
    })

    test("records a stopped chain instead of a deeper task", async () => {
        await setMaxTaskDepth(2)
        const answerSent = await createMessageSentEvent(["qa-tester"], 2)

        const dispatching = await dispatchToMentionListener()

        const [chainStoppedEvent] = dispatching.chainStoppedEvents
        const lastEvent = (await listEvents(projectRoot)).at(-1)
        expect(dispatching.createdTasks).toEqual([])
        expect(chainStoppedEvent).toMatchObject({
            type: "chain-stopped",
            depth: 2,
            causeEventId: answerSent.id,
            stoppedTask: {
                type: "catch-up-thread",
                positionId: "qa-tester",
                params: { threadId },
            },
        })
        expect(lastEvent).toEqual(chainStoppedEvent)
    })

    test("stops chains beyond 200 tasks, unless management sets it", async () => {
        await createMessageSentEvent(["qa-tester"], 199)
        await createMessageSentEvent(["backend-developer"], 200)

        const dispatching = await dispatchToMentionListener()

        expect(dispatching.createdTasks).toMatchObject([{ depth: 200 }])
        expect(dispatching.chainStoppedEvents).toHaveLength(1)
    })

    test("records a stopped chain once, even giving its event again", async () => {
        await createMessageSentEvent(["qa-tester"], 200)
        await dispatchToMentionListener()
        await rm(join(projectRoot, ".llmco", ".state"), { recursive: true })

        const { chainStoppedEvents } = await dispatchToMentionListener()

        expect(chainStoppedEvents).toEqual([])
    })
})

describe("dispatchEvents through the positions' id history", () => {
    const questionSentId = "20261018-140322-123-5d1e"
    const questionSent: MessageSentEvent = {
        id: questionSentId,
        type: "message-sent",
        occurredAt: "2026-10-18T14:03:22.123Z",
        depth: 0,
        threadId,
        messageId: "20261018-140322-123-3f9a",
        mentions: ["backend-developer"],
    }

    beforeEach(async () => {
        await Promise.all([
            savePosition(projectRoot, {
                id: "api-developer",
                title: "API Developer",
                description: "",
                formerIds: [
                    {
                        id: "backend-developer",
                        until: "2026-10-19T09:00:00.000Z",
                    },
                ],
            }),
            saveEvent(projectRoot, questionSent),
        ])
    })

    test("creates the task of a position renamed since, under its new id", async () => {
        const { createdTasks } = await dispatchToMentionListener()

        expect(createdTasks).toMatchObject([{ positionId: "api-developer" }])
    })

    test("recognizes the task it created before the position was renamed", async () => {
        await saveTask(projectRoot, {
            id: "20261018-140323-000-77aa",
            createdAt: "2026-10-18T14:03:23.000Z",
            type: "catch-up-thread",
            params: { threadId },
            positionId: "backend-developer",
            depth: 1,
            causeEventId: questionSentId,
        })

        const { createdTasks } = await dispatchToMentionListener()

        expect(createdTasks).toEqual([])
    })
})
