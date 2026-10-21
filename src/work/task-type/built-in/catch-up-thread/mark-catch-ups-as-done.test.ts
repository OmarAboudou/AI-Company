import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { getEventOfType } from "../../../../journal/get-event-of-type.ts"
import { recordEvent } from "../../../../journal/record-event.ts"
import { listEvents } from "../../../../journal/storage.ts"
import {
    type Message,
    messageSentEventType,
} from "../../../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../../../organization/company/create-temporary-company.testing.ts"
import { createTask } from "../../../task/create-task.ts"
import { getTaskStates } from "../../../task/get-task-states.ts"
import { type Task, taskDoneEventType } from "../../../task/schema.ts"
import { listTasks } from "../../../task/storage.ts"
import { markCatchUpsAsDone } from "./mark-catch-ups-as-done.ts"

const threadId = "2026-10-18-choice-of-framework"
let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function askPosition(positionId: string, askedThreadId = threadId) {
    const messageSentEvent = await recordEvent(
        projectRoot,
        messageSentEventType,
        {
            depth: 2,
            threadId: askedThreadId,
            messageId: "20261018-140322-123-3f9a",
            mentions: [positionId],
        },
    )
    const uncreatedTask = {
        type: "catch-up-thread",
        positionId,
        params: { threadId: askedThreadId },
    }
    return createTask(projectRoot, uncreatedTask, messageSentEvent)
}

const answer: Message = {
    threadId,
    id: "20261018-150000-000-9e8d",
    position: { id: "director", title: "Director" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    mentions: [],
    sentAt: "2026-10-18T15:00:00.000Z",
    body: "Hono.",
}

async function listStates(tasks: Task[]) {
    const events = await listEvents(projectRoot)
    const taskStates = getTaskStates(await listTasks(projectRoot), events)
    return tasks.map(({ id }) => taskStates.get(id))
}

describe("markCatchUpsAsDone", () => {
    test("marks the position's catch-ups of the thread as done, read up to its message", async () => {
        const catchUp = await askPosition("director")

        const doneTasks = await markCatchUpsAsDone(projectRoot, {
            positionId: "director",
            message: answer,
        })

        const events = await listEvents(projectRoot)
        const taskDoneEvent = events
            .map((event) => getEventOfType(event, taskDoneEventType))
            .find(Boolean)
        expect(doneTasks).toEqual([catchUp])
        expect(taskDoneEvent).toMatchObject({
            depth: 3,
            taskId: catchUp.id,
            result: { lastReadEntryId: answer.id },
        })
    })

    test("leaves the catch-ups of other positions and other threads", async () => {
        const testerCatchUp = await askPosition("qa-tester")
        const budgetCatchUp = await askPosition("director", "2026-10-18-budget")

        await markCatchUpsAsDone(projectRoot, {
            positionId: "director",
            message: answer,
        })

        const states = await listStates([testerCatchUp, budgetCatchUp])
        expect(states).toEqual(["waiting", "waiting"])
    })

    test("leaves a catch-up that already ended", async () => {
        const catchUp = await askPosition("director")
        await recordEvent(projectRoot, taskDoneEventType, {
            depth: 3,
            taskId: catchUp.id,
            summary: "Answered.",
            result: {},
        })

        const doneTasks = await markCatchUpsAsDone(projectRoot, {
            positionId: "director",
            message: answer,
        })

        expect(doneTasks).toEqual([])
    })
})
