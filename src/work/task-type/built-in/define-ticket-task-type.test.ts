import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../../journal/record-event.ts"
import { requireJournalEvent } from "../../../journal/require-journal-event.ts"
import { loadJournal } from "../../../journal/storage.ts"
import { actOnTicket } from "../../../messaging/ticket/act/act-on-ticket.ts"
import type { TicketActName } from "../../../messaging/ticket/act/ticket-acts.ts"
import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createTemporaryCompany } from "../../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { loadPosition } from "../../../organization/position/storage.ts"
import { createTask } from "../../task/create-task.ts"
import { type Task, taskStartedEventType } from "../../task/schema.ts"
import { createUncreatedTask } from "../create-uncreated-task.ts"
import { answerTaskType } from "./answer/answer.ts"
import { handleTaskType } from "./handle/handle.ts"
import { resumeTaskType } from "./resume/resume.ts"
import { validateTaskType } from "./validate/validate.ts"

type TicketTaskType = typeof handleTaskType

const committer = { name: "Test User", email: "test@example.com" }
const authors = {
    director: { position: { id: "director", title: "Director" }, committer },
    developer: { position: { id: "developer", title: "Developer" }, committer },
}

let projectRoot: string
let ticketNumber: number

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await createPosition(projectRoot, "developer", {
        title: "Developer",
        description: "",
    })
    const ticket = await createExampleTicket(projectRoot, {
        title: "Choose the API framework",
        request: "Hono or Express?",
        rawAssigneePositionId: "developer",
    })
    ticketNumber = ticket.number
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function act(actName: TicketActName, body: string) {
    const author =
        actName === "ask" || actName === "deliver"
            ? authors.developer
            : authors.director
    const journal = await loadJournal(projectRoot)
    return actOnTicket(
        journal,
        actName,
        author,
        { ticketNumber, body },
        {
            depth: 0,
        },
    )
}

async function createTicketTask(taskType: TicketTaskType, positionId: string) {
    const journal = await loadJournal(projectRoot)
    const causeEvent = journal.events.at(-1)
    if (causeEvent === undefined) {
        throw new Error("The journal has no event to cause the task")
    }
    const uncreatedTask = createUncreatedTask(taskType, {
        positionId,
        params: { ticketNumber },
    })
    return createTask(journal, uncreatedTask, causeEvent)
}

async function startTask(task: Task) {
    await recordEvent(await loadJournal(projectRoot), taskStartedEventType, {
        depth: 1,
        taskId: task.id,
        runId: "20261023-150000-000-9e8d",
        worker: { kind: "directors" },
    })
}

async function createSession(taskType: TicketTaskType, task: Task) {
    const journal = await loadJournal(projectRoot)
    const position = await loadPosition(projectRoot, task.positionId)
    const causeEvent = requireJournalEvent(journal, task.causeEventId)
    const ctx = { projectRoot, journal, task, position, causeEvent }
    return taskType.createSession(taskType.paramsSchema.parse(task.params), ctx)
}

async function loadCancellationReason(task: Task) {
    const journal = await loadJournal(projectRoot)
    const position = await loadPosition(projectRoot, task.positionId)
    const causeEvent = requireJournalEvent(journal, task.causeEventId)
    const ctx = { projectRoot, journal, task, position, causeEvent }
    const params = handleTaskType.paramsSchema.parse(task.params)
    return handleTaskType.getCancellationReason?.(params, ctx)
}

async function createUserMessage(taskType: TicketTaskType, positionId: string) {
    const task = await createTicketTask(taskType, positionId)
    const session = await createSession(taskType, task)
    return session.kind === "run" ? session.userMessage : ""
}

describe("a ticket's task", () => {
    test("gives the request, and says what the position is expected to do", async () => {
        const userMessage = await createUserMessage(handleTaskType, "developer")

        expect(userMessage).toBe(
            [
                "Director (@director) asks you for work, in ticket #1:",
                "",
                '<request ticket="1">',
                "# Choose the API framework",
                "",
                "Hono or Express?",
                "</request>",
                "",
                "Once its request is met, deliver it with ticket_deliver, saying what you did and how to check it. If you can't go on without an answer, ask its requester with ticket_ask.",
            ].join("\n"),
        )
    })

    test("gives the tools of the position's acts, and ticket_show, fixed to the ticket", async () => {
        const task = await createTicketTask(validateTaskType, "director")

        const session = await createSession(validateTaskType, task)

        expect(session).toMatchObject({
            kind: "run",
            toolNames: [
                "ticket_validate",
                "ticket_refuse",
                "ticket_cancel",
                "ticket_show",
            ],
            boundToolInputs: {
                ticket_validate: { ticketNumber },
                ticket_refuse: { ticketNumber },
                ticket_cancel: { ticketNumber },
                ticket_show: { ticketNumber },
            },
        })
    })

    test("gives the whole discussion at the position's first session", async () => {
        await act("ask", "Bun or Node?")

        const userMessage = await createUserMessage(answerTaskType, "director")

        expect(userMessage).toStartWith(
            "Developer (@developer) asks you a question on ticket #1, which you asked of it:",
        )
        expect(userMessage).toContain('Its discussion:\n\n<message number="1"')
        expect(userMessage).toContain("Bun or Node?")
    })

    test("gives the messages since the position's last session began", async () => {
        await startTask(await createTicketTask(handleTaskType, "developer"))
        await act("deliver", "Hono, for Bun.")
        await act("refuse", "Why Hono?")
        await startTask(await createTicketTask(resumeTaskType, "developer"))
        await act("ask", "Bun 1.4?")
        await act("answer", "Yes.")

        const userMessage = await createUserMessage(resumeTaskType, "developer")

        const introduction =
            "Resume your work on ticket #1, which Director (@director) asked of you:"
        const discussionHeading =
            "Its discussion since your last session on it, from message #3 (ticket_show reads the earlier ones):"
        expect(userMessage).toStartWith(introduction)
        expect(userMessage).toContain(discussionHeading)
        expect(userMessage).not.toContain("Why Hono?")
        expect(userMessage).toContain("Bun 1.4?")
        expect(userMessage).toContain("Yes.")
    })

    test("becomes pointless once its ticket is closed", async () => {
        const task = await createTicketTask(handleTaskType, "developer")
        const before = await loadCancellationReason(task)
        await act("cancel", "Never mind.")

        const after = await loadCancellationReason(task)

        expect(before).toBeUndefined()
        expect(after).toBe(`Ticket #${ticketNumber} was closed, cancelled.`)
    })

    test("says when no message arrived since the position's last session", async () => {
        await act("ask", "Bun or Node?")
        const answering = await createTicketTask(answerTaskType, "director")
        await startTask(answering)

        const userMessage = await createUserMessage(answerTaskType, "director")

        expect(userMessage).toContain(
            "No message arrived since your last session on it: ticket_show reads its discussion.",
        )
    })
})
