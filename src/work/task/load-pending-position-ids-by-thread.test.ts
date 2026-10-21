import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../journal/record-event.ts"
import { loadJournal } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { createTask } from "./create-task.ts"
import { loadPendingPositionIdsByThread } from "./load-pending-position-ids-by-thread.ts"
import { taskFailedEventType } from "./schema.ts"

const frameworkThreadId = "2026-10-18-choice-of-framework"
const budgetThreadId = "2026-10-18-budget"
let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function askPosition(positionId: string, threadId: string) {
    const messageSentEvent = await recordEvent(
        await loadJournal(projectRoot),
        messageSentEventType,
        {
            depth: 0,
            threadId,
            messageId: "20261018-140322-123-3f9a",
            positionId: "director",
            mentions: [positionId],
        },
    )
    const uncreatedTask = {
        type: "catch-up-thread",
        positionId,
        params: { threadId },
    }
    return createTask(
        await loadJournal(projectRoot),
        uncreatedTask,
        messageSentEvent,
    )
}

describe("loadPendingPositionIdsByThread", () => {
    test("gives each thread the positions with a pending task there", async () => {
        await askPosition("backend-developer", frameworkThreadId)
        await askPosition("qa-tester", frameworkThreadId)
        await askPosition("backend-developer", frameworkThreadId)
        await askPosition("director", budgetThreadId)

        const pendingPositionIds = await loadPendingPositionIdsByThread(
            await loadJournal(projectRoot),
        )

        expect(pendingPositionIds).toEqual(
            new Map([
                [frameworkThreadId, ["backend-developer", "qa-tester"]],
                [budgetThreadId, ["director"]],
            ]),
        )
    })

    test("leaves out the tasks that ended", async () => {
        const task = await askPosition("qa-tester", frameworkThreadId)
        await recordEvent(await loadJournal(projectRoot), taskFailedEventType, {
            depth: 1,
            taskId: task.id,
            reason: "The thread asks nothing.",
        })

        const pendingPositionIds = await loadPendingPositionIdsByThread(
            await loadJournal(projectRoot),
        )

        expect(pendingPositionIds).toEqual(new Map())
    })
})
