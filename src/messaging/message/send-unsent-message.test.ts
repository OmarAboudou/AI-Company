import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { createExampleTicket } from "../ticket/create-example-ticket.testing.ts"
import { defineMessageEventType, type UnsentMessage } from "./schema.ts"
import { sendUnsentMessage } from "./send-unsent-message.ts"
import { listMessages } from "./storage.ts"

const question: UnsentMessage = {
    position: { id: "founder", title: "Founder" },
    committer: { name: "Test User", email: "test@example.com" },
    body: "Hono or Express?",
}

let projectRoot: string
let ticketNumber: number

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    const ticket = await createExampleTicket(projectRoot)
    ticketNumber = ticket.number
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function sendQuestion(
    options: Parameters<typeof sendUnsentMessage>[3] = { depth: 0 },
) {
    const journal = await loadJournal(projectRoot)
    return sendUnsentMessage(journal, ticketNumber, question, options)
}

describe("sendUnsentMessage", () => {
    test("writes the message in the ticket's discussion", async () => {
        const message = await sendQuestion()

        expect(await listMessages(projectRoot, ticketNumber)).toEqual([message])
        expect(message).toMatchObject({ ticketNumber, ...question })
    })

    test("dates each message after the one before", async () => {
        const firstMessage = await sendQuestion()

        const secondMessage = await sendQuestion()

        expect(secondMessage.sentAt > firstMessage.sentAt).toBe(true)
        expect(secondMessage.id > firstMessage.id).toBe(true)
    })

    test("records that a message was sent, at its depth, with its run", async () => {
        const runId = "20261023-150000-000-9e8d"

        const message = await sendQuestion({ depth: 2, runId })

        expect((await listEvents(projectRoot)).at(-1)).toMatchObject({
            type: "message-sent",
            depth: 2,
            ticketNumber,
            messageId: message.id,
            positionId: "founder",
            runId,
        })
    })

    test("records the event of the act the message carries", async () => {
        const questionAskedEventType = defineMessageEventType({
            type: "test-question-asked",
            description: "A test asked a question.",
        })

        const message = await sendQuestion({
            depth: 0,
            eventType: questionAskedEventType,
        })

        expect((await listEvents(projectRoot)).at(-1)).toMatchObject({
            type: "test-question-asked",
            messageId: message.id,
        })
    })
})
