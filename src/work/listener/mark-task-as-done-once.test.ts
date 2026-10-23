import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { z } from "zod"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { createTask } from "../task/create-task.ts"
import { type Task, taskFailedEventType } from "../task/schema.ts"
import { builtInTaskTypes } from "../task-type/built-in/built-in.ts"
import type { MarkTaskAsDoneEffect } from "./define-listener.ts"
import { loadDispatching } from "./load-dispatching.ts"
import { markTaskAsDoneOnce } from "./mark-task-as-done-once.ts"

const threadId = "2026-10-18-choice-of-framework"
const answerId = "20261018-150000-000-9e8d"
let projectRoot: string
let catchUp: Task

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    const questionSent = await recordEvent(
        await loadJournal(projectRoot),
        messageSentEventType,
        {
            depth: 0,
            threadId,
            messageId: "20261018-140322-123-3f9a",
            positionId: "director",
            mentions: ["qa-tester"],
        },
    )
    const uncreatedTask = {
        type: "catch-up-thread",
        positionId: "qa-tester",
        params: { threadId },
    }
    catchUp = await createTask(
        await loadJournal(projectRoot),
        uncreatedTask,
        questionSent,
    )
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function createMarking(
    result: Record<string, unknown> = { lastReadEntryId: answerId },
): MarkTaskAsDoneEffect {
    return {
        kind: "mark-task-as-done",
        taskId: catchUp.id,
        summary: "Sent a message in the thread.",
        result,
    }
}

async function markInNewDispatching(marking = createMarking()) {
    const dispatching = await loadDispatching(
        await loadJournal(projectRoot),
        builtInTaskTypes,
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

        expect(doneTasks).toEqual([catchUp])
        expect(await listTaskDoneEvents()).toMatchObject([
            {
                depth: 1,
                taskId: catchUp.id,
                summary: "Sent a message in the thread.",
                result: { lastReadEntryId: answerId },
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
            taskId: catchUp.id,
            reason: "The thread asks nothing.",
        })

        const { doneTasks } = await markInNewDispatching()

        expect(doneTasks).toEqual([])
        expect(await listTaskDoneEvents()).toEqual([])
    })

    test("refuses a result that the task's type rejects", async () => {
        const wrongMarking = createMarking({ readUpTo: answerId })

        const markingAsDone = markInNewDispatching(wrongMarking)

        await expect(markingAsDone).rejects.toThrow(z.ZodError)
    })
})
