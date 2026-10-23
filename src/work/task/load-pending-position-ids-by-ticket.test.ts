import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../journal/record-event.ts"
import { loadJournal } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { createTask } from "./create-task.ts"
import { loadPendingPositionIdsByTicket } from "./load-pending-position-ids-by-ticket.ts"
import { taskFailedEventType } from "./schema.ts"

const frameworkTicketNumber = 1
const budgetTicketNumber = 2
let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function askPosition(positionId: string, ticketNumber: number) {
    const messageSentEvent = await recordEvent(
        await loadJournal(projectRoot),
        messageSentEventType,
        {
            depth: 0,
            ticketNumber,
            messageId: "20261018-140322-123-3f9a",
            positionId: "founder",
        },
    )
    const uncreatedTask = {
        type: "example",
        positionId,
        params: { ticketNumber },
    }
    return createTask(
        await loadJournal(projectRoot),
        uncreatedTask,
        messageSentEvent,
    )
}

describe("loadPendingPositionIdsByTicket", () => {
    test("gives each ticket the positions with a pending task on it", async () => {
        await askPosition("backend-developer", frameworkTicketNumber)
        await askPosition("qa-tester", frameworkTicketNumber)
        await askPosition("backend-developer", frameworkTicketNumber)
        await askPosition("founder", budgetTicketNumber)

        const pendingPositionIds = await loadPendingPositionIdsByTicket(
            await loadJournal(projectRoot),
        )

        expect(pendingPositionIds).toEqual(
            new Map([
                [frameworkTicketNumber, ["backend-developer", "qa-tester"]],
                [budgetTicketNumber, ["founder"]],
            ]),
        )
    })

    test("leaves out the tasks that ended", async () => {
        const task = await askPosition("qa-tester", frameworkTicketNumber)
        await recordEvent(await loadJournal(projectRoot), taskFailedEventType, {
            depth: 1,
            taskId: task.id,
            reason: "The ticket asks nothing.",
        })

        const pendingPositionIds = await loadPendingPositionIdsByTicket(
            await loadJournal(projectRoot),
        )

        expect(pendingPositionIds).toEqual(new Map())
    })
})
