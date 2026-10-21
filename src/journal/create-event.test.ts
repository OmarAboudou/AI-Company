import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createEvent, type NewJournalEvent } from "./create-event.ts"
import { listEvents } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const questionSent: NewJournalEvent = {
    type: "message-sent",
    depth: 0,
    threadId: "2026-10-18-choice-of-framework",
    messageId: "20261018-140322-123-3f9a",
    mentions: ["backend-developer"],
}

describe("createEvent", () => {
    test("saves the event with the time it happens", async () => {
        const clockTime = Date.now()

        const event = await createEvent(projectRoot, questionSent)

        expect(event).toMatchObject(questionSent)
        expect(Date.parse(event.occurredAt)).toBeGreaterThanOrEqual(clockTime)
        expect(await listEvents(projectRoot)).toEqual([event])
    })

    test("keeps the order of creation, even within a millisecond", async () => {
        const createdEvents = await Promise.all(
            Array.from({ length: 20 }, () =>
                createEvent(projectRoot, questionSent),
            ),
        )

        expect(await listEvents(projectRoot)).toEqual(createdEvents)
    })
})
