import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { IdSchema } from "../../ids/id-schema.ts"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { defineEventType } from "../../journal/schema.ts"
import { listEvents, loadJournal, saveEvent } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
import { listTasks } from "../task/storage.ts"
import { defineListener, type Listener } from "./define-listener.ts"
import { dispatchEvents } from "./dispatch-events.ts"
import { eventsDispatchedEventType } from "./schema.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const ticketNumber = 1
const exampleCatalog = createExampleWorkCatalog(["backend-developer"])

async function createMessageSentEvent(
    positionId = "director",
    depth = 0,
    eventTicketNumber = ticketNumber,
) {
    return recordEvent(await loadJournal(projectRoot), messageSentEventType, {
        depth,
        ticketNumber: eventTicketNumber,
        messageId: "20261018-140322-123-3f9a",
        positionId,
    })
}

const reviewListener = defineListener({
    eventType: messageSentEventType,
    getEffects: ({ ticketNumber }) => [
        {
            kind: "create-task",
            task: {
                type: "review-ticket",
                positionId: "qa-tester",
                params: { ticketNumber },
            },
        },
    ],
})

const positionNotedEventType = defineEventType({
    type: "test-position-noted",
    description: "A test noted that a position has nothing left to do.",
    fields: { positionId: IdSchema },
})

const notingListener = defineListener({
    eventType: positionNotedEventType,
    getEffects: ({ positionId }, { tasks, taskStates }) =>
        tasks
            .filter(
                (task) =>
                    task.positionId === positionId &&
                    taskStates.get(task.id) === "queued",
            )
            .map((task) => ({
                kind: "cancel-task",
                taskId: task.id,
                reason: "Noted as having nothing left to do.",
            })),
})

async function dispatchToListeners(listeners: Listener[]) {
    return dispatchEvents(await loadJournal(projectRoot), {
        taskTypes: exampleCatalog.taskTypes,
        listeners,
    })
}

async function dispatchToExampleListener() {
    return dispatchEvents(await loadJournal(projectRoot), exampleCatalog)
}

async function listDispatchings() {
    const events = await listEvents(projectRoot)
    return events.flatMap((event) => {
        const dispatching = getEventOfType(event, eventsDispatchedEventType)
        return dispatching === undefined ? [] : [dispatching]
    })
}

describe("dispatchEvents", () => {
    test("applies the effects that listeners return", async () => {
        const questionSent = await createMessageSentEvent()

        const { createdTasks } = await dispatchToExampleListener()

        expect(createdTasks).toMatchObject([
            {
                type: "example",
                positionId: "backend-developer",
                causeEventId: questionSent.id,
            },
        ])
        expect(await listTasks(projectRoot)).toEqual(createdTasks)
    })

    test("gives each event to every listener subscribed to it", async () => {
        await createMessageSentEvent()
        const listeners = [...exampleCatalog.listeners, reviewListener]

        const { createdTasks } = await dispatchToListeners(listeners)

        const taskTypes = createdTasks.map(({ type }) => type)
        expect(taskTypes).toEqual(["example", "review-ticket"])
    })

    test("records in the journal the events it gave, even those that ask nothing", async () => {
        const questionSent = await createMessageSentEvent()
        const answerSent = await createMessageSentEvent("backend-developer")

        await dispatchToExampleListener()

        const dispatchings = await listDispatchings()
        expect(dispatchings).toMatchObject([
            { depth: 0, eventIds: [questionSent.id, answerSent.id] },
        ])
    })

    test("gives an event only once", async () => {
        await createMessageSentEvent()
        await dispatchToExampleListener()
        const followUpSent = await createMessageSentEvent("qa-tester", 1, 2)

        const { createdTasks } = await dispatchToExampleListener()

        expect(createdTasks).toMatchObject([{ causeEventId: followUpSent.id }])
        expect(await listTasks(projectRoot)).toHaveLength(2)
    })

    test("records nothing more, its own records being no events to give", async () => {
        await createMessageSentEvent("backend-developer")
        await dispatchToExampleListener()

        await dispatchToExampleListener()

        expect(await listDispatchings()).toHaveLength(1)
    })

    test("creates nothing twice, even giving events again after a crash", async () => {
        await createMessageSentEvent()
        await dispatchToExampleListener()
        const [dispatching] = await listDispatchings()
        const journalFolderPath = join(projectRoot, ".aico", "journal")
        await rm(join(journalFolderPath, `${dispatching?.id}.json`))

        const { createdTasks } = await dispatchToExampleListener()

        expect(createdTasks).toEqual([])
        expect(await listTasks(projectRoot)).toHaveLength(1)
    })

    test("shows listeners the tasks that earlier events created", async () => {
        await createMessageSentEvent()
        await recordEvent(
            await loadJournal(projectRoot),
            positionNotedEventType,
            {
                depth: 0,
                positionId: "backend-developer",
            },
        )
        const listeners = [...exampleCatalog.listeners, notingListener]

        const { createdTasks, cancelledTasks } =
            await dispatchToListeners(listeners)

        expect(createdTasks).toHaveLength(1)
        expect(cancelledTasks).toEqual(createdTasks)
    })

    test("passes over an event of a type no listener handles", async () => {
        const ticketStarred = {
            id: "20261018-150000-000-9e3f",
            type: "ticket-starred",
            occurredAt: "2026-10-18T15:00:00.000Z",
            depth: 0,
            ticketNumber,
        }
        await saveEvent(projectRoot, ticketStarred)

        const { createdTasks } = await dispatchToExampleListener()

        expect(createdTasks).toEqual([])
        expect(await listDispatchings()).toMatchObject([
            { eventIds: [ticketStarred.id] },
        ])
    })
})
