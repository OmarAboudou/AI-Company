import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { recordEvent } from "./record-event.ts"
import { messageSentEventType } from "./schema.ts"
import { listEvents } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const questionSent = {
    depth: 0,
    threadId: "2026-10-18-choice-of-framework",
    messageId: "20261018-140322-123-3f9a",
    mentions: ["backend-developer"],
}

function recordQuestionSent() {
    return recordEvent(projectRoot, messageSentEventType, questionSent)
}

describe("recordEvent", () => {
    test("saves the event, of its type, with the time it happens", async () => {
        const clockTime = Date.now()

        const event = await recordQuestionSent()

        expect(event).toMatchObject({ type: "message-sent", ...questionSent })
        expect(Date.parse(event.occurredAt)).toBeGreaterThanOrEqual(clockTime)
        expect(await listEvents(projectRoot)).toEqual([event])
    })

    test("refuses an event that its type's schema rejects", async () => {
        const invalidQuestionSent = { ...questionSent, mentions: ["QA Tester"] }

        const recording = recordEvent(
            projectRoot,
            messageSentEventType,
            invalidQuestionSent,
        )

        await expect(recording).rejects.toThrow("must be kebab-case")
        expect(await listEvents(projectRoot)).toEqual([])
    })

    test("keeps the order of recording, even within a millisecond", async () => {
        const recordedEvents = await Promise.all(
            Array.from({ length: 20 }, recordQuestionSent),
        )

        expect(await listEvents(projectRoot)).toEqual(recordedEvents)
    })
})
