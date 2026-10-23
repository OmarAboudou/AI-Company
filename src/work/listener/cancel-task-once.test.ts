import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import {
    createExampleWorkCatalog,
    exampleTaskType,
} from "../create-example-work-catalog.testing.ts"
import { createTask } from "../task/create-task.ts"
import { type Task, taskStartedEventType } from "../task/schema.ts"
import { createUncreatedTask } from "../task-type/create-uncreated-task.ts"
import { cancelTaskOnce } from "./cancel-task-once.ts"
import { loadDispatching } from "./load-dispatching.ts"

const ticketNumber = 1
let projectRoot: string
let exampleTask: Task

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    const questionSent = await recordEvent(
        await loadJournal(projectRoot),
        messageSentEventType,
        {
            depth: 0,
            ticketNumber,
            messageId: "20261018-140322-123-3f9a",
            positionId: "director",
        },
    )
    const uncreatedTask = createUncreatedTask(exampleTaskType, {
        positionId: "qa-tester",
        params: { ticketNumber },
    })
    exampleTask = await createTask(
        await loadJournal(projectRoot),
        uncreatedTask,
        questionSent,
    )
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const cancellation = {
    kind: "cancel-task",
    reason: "Ticket #1 was closed.",
} as const

async function cancelInNewDispatching() {
    const dispatching = await loadDispatching(
        await loadJournal(projectRoot),
        createExampleWorkCatalog().taskTypes,
    )
    await cancelTaskOnce(
        { ...cancellation, taskId: exampleTask.id },
        dispatching,
    )
    return dispatching
}

async function listTaskCancelledEvents() {
    const events = await listEvents(projectRoot)
    return events.filter(({ type }) => type === "task-cancelled")
}

describe("cancelTaskOnce", () => {
    test("records a queued task cancelled, with why, at the task's depth", async () => {
        const { cancelledTasks, taskStates } = await cancelInNewDispatching()

        expect(cancelledTasks).toEqual([exampleTask])
        expect(taskStates.get(exampleTask.id)).toBe("cancelled")
        expect(await listTaskCancelledEvents()).toMatchObject([
            {
                depth: 1,
                taskId: exampleTask.id,
                reason: "Ticket #1 was closed.",
            },
        ])
    })

    test("cancels a task once, even asked again", async () => {
        await cancelInNewDispatching()

        const { cancelledTasks } = await cancelInNewDispatching()

        expect(cancelledTasks).toEqual([])
        expect(await listTaskCancelledEvents()).toHaveLength(1)
    })

    test("leaves a running task to its run", async () => {
        await recordEvent(
            await loadJournal(projectRoot),
            taskStartedEventType,
            {
                depth: 1,
                taskId: exampleTask.id,
                runId: "20261018-150000-000-9e8d",
                worker: { kind: "user" },
            },
        )

        const { cancelledTasks } = await cancelInNewDispatching()

        expect(cancelledTasks).toEqual([])
        expect(await listTaskCancelledEvents()).toEqual([])
    })
})
