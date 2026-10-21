import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createEvent } from "../../journal/create-event.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import { listTasks } from "../task/storage.ts"
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

async function createMessageSentEvent(mentions: string[], depth = 0) {
    return createEvent(projectRoot, {
        type: "message-sent",
        depth,
        threadId,
        messageId: "20261018-140322-123-3f9a",
        mentions,
    })
}

const reviewListener = defineListener({
    on: {
        "message-sent": ({ threadId }) => [
            {
                type: "review-thread",
                positionId: "qa-tester",
                params: { threadId },
            },
        ],
    },
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
})
