import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { z } from "zod"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import {
    createExampleWorkCatalog,
    exampleTaskType,
} from "../create-example-work-catalog.testing.ts"
import { createTask } from "../task/create-task.ts"
import { type Task, taskFailedEventType } from "../task/schema.ts"
import { createUncreatedTask } from "../task-type/create-uncreated-task.ts"
import type { MarkTaskAsDoneEffect } from "./define-listener.ts"
import { loadDispatching } from "./load-dispatching.ts"
import { markTaskAsDoneOnce } from "./mark-task-as-done-once.ts"

const ticketNumber = 1
const runId = "20261018-150000-000-9e8d"
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

function createMarking(
    result: Record<string, unknown> = { runId },
): MarkTaskAsDoneEffect {
    return {
        kind: "mark-task-as-done",
        taskId: exampleTask.id,
        summary: "Sent a message in the ticket's discussion.",
        result,
    }
}

async function markInNewDispatching(marking = createMarking()) {
    const dispatching = await loadDispatching(
        await loadJournal(projectRoot),
        createExampleWorkCatalog().taskTypes,
    )
    await markTaskAsDoneOnce(marking, dispatching)
    return dispatching
}

async function listTaskDoneEvents() {
    const events = await listEvents(projectRoot)
    return events.filter(({ type }) => type === "task-done")
}

describe("markTaskAsDoneOnce", () => {
    test("records the task done, with its result, at the task's depth", async () => {
        const { doneTasks } = await markInNewDispatching()

        expect(doneTasks).toEqual([exampleTask])
        expect(await listTaskDoneEvents()).toMatchObject([
            {
                depth: 1,
                taskId: exampleTask.id,
                summary: "Sent a message in the ticket's discussion.",
                result: { runId },
            },
        ])
    })

    test("marks a task as done once, even asked again", async () => {
        await markInNewDispatching()

        const { doneTasks } = await markInNewDispatching()

        expect(doneTasks).toEqual([])
        expect(await listTaskDoneEvents()).toHaveLength(1)
    })

    test("leaves a task that already ended", async () => {
        await recordEvent(await loadJournal(projectRoot), taskFailedEventType, {
            depth: 1,
            taskId: exampleTask.id,
            reason: "The ticket asks nothing.",
        })

        const { doneTasks } = await markInNewDispatching()

        expect(doneTasks).toEqual([])
        expect(await listTaskDoneEvents()).toEqual([])
    })

    test("refuses a result that the task's type rejects", async () => {
        const wrongMarking = createMarking({ runIds: [runId] })

        const markingAsDone = markInNewDispatching(wrongMarking)

        await expect(markingAsDone).rejects.toThrow(z.ZodError)
    })
})
