import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { requireJournalEvent } from "../../../../journal/require-journal-event.ts"
import { loadJournal } from "../../../../journal/storage.ts"
import type { Author } from "../../../../messaging/message/schema.ts"
import { actOnTicket } from "../../../../messaging/ticket/act/act-on-ticket.ts"
import { handOverTicket } from "../../../../messaging/ticket/act/hand-over-ticket.ts"
import { createExampleTicket } from "../../../../messaging/ticket/create-example-ticket.testing.ts"
import { createTemporaryCompany } from "../../../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../../../organization/position/create-position.ts"
import { loadPosition } from "../../../../organization/position/storage.ts"
import { createTask } from "../../../task/create-task.ts"
import type { Task } from "../../../task/schema.ts"
import { createUncreatedTask } from "../../create-uncreated-task.ts"
import { analyseRenouncementTaskType } from "./analyse-renouncement.ts"

const committer = { name: "Test User", email: "test@example.com" }
const founder: Author = {
    position: { id: "founder", title: "Founder" },
    committer,
}
const developer: Author = {
    position: { id: "developer", title: "Developer" },
    committer,
}

let projectRoot: string
let analysis: Task

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all(
        ["developer", "designer"].map((id) =>
            createPosition(projectRoot, id, {
                title: id === "developer" ? "Developer" : "Designer",
                description: "",
            }),
        ),
    )
    await createExampleTicket(projectRoot, {
        title: "Draw the logo",
        rawAssigneePositionId: "developer",
    })
    await actOnTicket(
        await loadJournal(projectRoot),
        "renounce",
        developer,
        { ticketNumber: 1, body: "I can't draw." },
        { depth: 0 },
    )
    const journal = await loadJournal(projectRoot)
    const renouncedEvent = journal.events.at(-1)
    if (renouncedEvent === undefined) {
        throw new Error("Renouncing recorded no event")
    }
    analysis = await createTask(
        journal,
        createUncreatedTask(analyseRenouncementTaskType, {
            positionId: "founder",
            params: { ticketNumber: 1 },
        }),
        renouncedEvent,
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

describe("Analyse the renouncement", () => {
    test("gives what went wrong, and the tools to arbitrate", async () => {
        const session = await analyseRenouncementTaskType.createSession(
            { ticketNumber: 1 },
            await loadTaskTypeContext(),
        )

        expect(session.userMessage).toStartWith(
            "Developer (@developer) renounced ticket #1, which paused the company:",
        )
        expect(session.userMessage).toContain("I can't draw.")
        expect(session.toolNames).toEqual([
            "ticket_give-back",
            "ticket_hand-over",
            "ticket_close",
            "ticket_show",
        ])
    })

    test("becomes pointless once the ticket is arbitrated", async () => {
        await handOverTicket(
            await loadJournal(projectRoot),
            founder,
            {
                ticketNumber: 1,
                body: "The designer draws.",
                rawAssigneePositionId: "designer",
            },
            { depth: 0 },
        )

        const reason =
            await analyseRenouncementTaskType.getCancellationReason?.(
                { ticketNumber: 1 },
                await loadTaskTypeContext(),
            )

        expect(reason).toBe("Ticket #1 changed since: @designer has the hand.")
    })
})
