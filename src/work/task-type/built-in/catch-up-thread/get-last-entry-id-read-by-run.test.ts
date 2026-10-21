import { describe, expect, test } from "bun:test"
import type { EventOfType } from "../../../../journal/schema.ts"
import type {
    Message,
    messageSentEventType,
} from "../../../../messaging/message/schema.ts"
import { getLastEntryIdReadByRun } from "./get-last-entry-id-read-by-run.ts"

const runId = "20261018-140324-000-1b2c"
const threadId = "2026-10-18-choice-of-framework"

function createMessage(id: string): Message {
    return {
        threadId,
        id,
        position: { id: "director", title: "Director" },
        committer: { name: "Omar Aboudou", email: "omar@example.com" },
        mentions: [],
        sentAt: "2026-10-18T14:03:22.123Z",
        body: "Hono or Express?",
    }
}

function createMessageSentEvent(
    messageId: string,
    sendingRunId?: string,
): EventOfType<typeof messageSentEventType> {
    return {
        id: `${messageId}-sent`,
        type: "message-sent",
        occurredAt: "2026-10-18T14:03:22.123Z",
        depth: sendingRunId === undefined ? 0 : 1,
        threadId,
        messageId,
        mentions: [],
        ...(sendingRunId !== undefined && { runId: sendingRunId }),
    }
}

const question = createMessage("20261018-140322-123-3f9a")
const answer = createMessage("20261018-140330-000-4b0e")
const interjection = createMessage("20261018-140331-000-5c1f")
const addendum = createMessage("20261018-140340-000-6d2a")
const run = { runId, lastShownEntryId: question.id }

describe("getLastEntryIdReadByRun", () => {
    test("is the last entry shown when the run sent nothing", () => {
        const events = [createMessageSentEvent(question.id)]

        const lastReadEntryId = getLastEntryIdReadByRun([question], events, run)

        expect(lastReadEntryId).toBe(question.id)
    })

    test("goes on past the messages the run sent right after", () => {
        const messages = [question, answer, addendum]
        const events = [
            createMessageSentEvent(question.id),
            createMessageSentEvent(answer.id, runId),
            createMessageSentEvent(addendum.id, runId),
        ]

        const lastReadEntryId = getLastEntryIdReadByRun(messages, events, run)

        expect(lastReadEntryId).toBe(addendum.id)
    })

    test("stops before an entry written elsewhere during the run", () => {
        const messages = [question, answer, interjection, addendum]
        const events = [
            createMessageSentEvent(question.id),
            createMessageSentEvent(answer.id, runId),
            createMessageSentEvent(interjection.id),
            createMessageSentEvent(addendum.id, runId),
        ]

        const lastReadEntryId = getLastEntryIdReadByRun(messages, events, run)

        expect(lastReadEntryId).toBe(answer.id)
    })

    test("leaves out the messages that another run sent", () => {
        const messages = [question, answer]
        const otherRunId = "20261018-140329-000-2c3d"
        const events = [
            createMessageSentEvent(question.id),
            createMessageSentEvent(answer.id, otherRunId),
        ]

        const lastReadEntryId = getLastEntryIdReadByRun(messages, events, run)

        expect(lastReadEntryId).toBe(question.id)
    })
})
