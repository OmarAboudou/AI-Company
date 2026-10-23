import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../../../journal/record-event.ts"
import { requireJournalEvent } from "../../../../journal/require-journal-event.ts"
import { loadJournal } from "../../../../journal/storage.ts"
import { createExampleTicket } from "../../../../messaging/ticket/create-example-ticket.testing.ts"
import { createTemporaryCompany } from "../../../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../../../organization/position/create-position.ts"
import { loadPosition } from "../../../../organization/position/storage.ts"
import { relaunchCompany } from "../../../pause/relaunch-company.ts"
import { createTask } from "../../../task/create-task.ts"
import { type Task, taskFailedEventType } from "../../../task/schema.ts"
import { createUncreatedTask } from "../../create-uncreated-task.ts"
import { handleTaskType } from "../handle/handle.ts"
import { analyseFailureTaskType } from "./analyse-failure.ts"

const failureReason = "The model's turn was cut at its maximum length."
let projectRoot: string
let failedTask: Task
let analysis: Task

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await createPosition(projectRoot, "developer", {
        title: "Developer",
        description: "",
    })
    const ticket = await createExampleTicket(projectRoot, {
        title: "Choose the API framework",
        rawAssigneePositionId: "developer",
    })
    const journal = await loadJournal(projectRoot)
    const [ticketCreatedEvent] = journal.events
    if (ticketCreatedEvent === undefined) {
        throw new Error("Creating the ticket recorded no event")
    }
    failedTask = await createTask(
        journal,
        createUncreatedTask(handleTaskType, {
            positionId: "developer",
            params: { ticketNumber: ticket.number },
        }),
        ticketCreatedEvent,
    )
    const failedEvent = await recordEvent(journal, taskFailedEventType, {
        depth: 1,
        taskId: failedTask.id,
        reason: failureReason,
    })
    analysis = await createTask(
        journal,
        createUncreatedTask(analyseFailureTaskType, {
            positionId: "founder",
            params: { taskId: failedTask.id },
        }),
        failedEvent,
    )
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function loadTaskTypeContext() {
    const journal = await loadJournal(projectRoot)
    const position = await loadPosition(projectRoot, analysis.positionId)
    const causeEvent = requireJournalEvent(journal, analysis.causeEventId)
    return { projectRoot, journal, task: analysis, position, causeEvent }
}

describe("Analyse the failure", () => {
    test("gives the failure, the task that failed and its ticket", async () => {
        const session = await analyseFailureTaskType.createSession(
            { taskId: failedTask.id },
            await loadTaskTypeContext(),
        )

        expect(session.userMessage).toBe(
            [
                `Task "${failedTask.id}", handle, of Developer (@developer), failed: ${failureReason}`,
                'It worked on ticket #1, "Choose the API framework": ticket_show reads its discussion; ticket_hand-over hands the ticket to another position, and ticket_close closes it as failed, should its request not be met.',
                "",
                "The company is paused since. Find out what went wrong, and readjust what was missing with AICo's commands: the position's title or description, its employee, the model or the provider it runs on. Then relaunch the company with `aico company relaunch`: the position that has the ticket's hand gets its task again.",
            ].join("\n"),
        )
        expect(session).toMatchObject({
            toolNames: ["ticket_hand-over", "ticket_close", "ticket_show"],
            boundToolInputs: {
                "ticket_hand-over": { ticketNumber: 1 },
                ticket_close: { ticketNumber: 1 },
                ticket_show: { ticketNumber: 1 },
            },
        })
    })

    test("becomes pointless once the company is relaunched", async () => {
        const params = { taskId: failedTask.id }
        const before = await analyseFailureTaskType.getCancellationReason?.(
            params,
            await loadTaskTypeContext(),
        )
        await relaunchCompany(await loadJournal(projectRoot))

        const after = await analyseFailureTaskType.getCancellationReason?.(
            params,
            await loadTaskTypeContext(),
        )

        expect(before).toBeUndefined()
        expect(after).toBe("The company was relaunched since the failure.")
    })
})
