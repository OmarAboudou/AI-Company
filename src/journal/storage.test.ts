import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { JournalEvent } from "./schema.ts"
import { listEvents, saveEvent } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const questionSent: JournalEvent = {
    id: "20261018-140322-123-5d1e",
    type: "message-sent",
    occurredAt: "2026-10-18T14:03:22.123Z",
    depth: 0,
    threadId: "2026-10-18-choice-of-framework",
    messageId: "20261018-140322-123-3f9a",
    mentions: ["backend-developer"],
}

const answerSent: JournalEvent = {
    ...questionSent,
    id: "20261018-140351-000-8c2a",
    occurredAt: "2026-10-18T14:03:51.000Z",
    depth: 1,
    messageId: "20261018-140351-000-b27c",
    mentions: [],
}

describe("saveEvent and listEvents", () => {
    test("write the event in the journal, then read it back", async () => {
        await saveEvent(projectRoot, questionSent)

        const eventPath = join(
            projectRoot,
            ".llmco",
            "journal",
            `${questionSent.id}.json`,
        )
        const { id, ...content } = questionSent
        expect(await Bun.file(eventPath).json()).toEqual(content)
        expect(await listEvents(projectRoot)).toEqual([questionSent])
    })

    test("list returns the events oldest first", async () => {
        await saveEvent(projectRoot, answerSent)
        await saveEvent(projectRoot, questionSent)

        expect(await listEvents(projectRoot)).toEqual([
            questionSent,
            answerSent,
        ])
    })

    test("list is empty before the first event", async () => {
        expect(await listEvents(projectRoot)).toEqual([])
    })

    test("save never overwrites an event", async () => {
        await saveEvent(projectRoot, questionSent)
        const eventWithSameId = { ...answerSent, id: questionSent.id }

        const overwriting = saveEvent(projectRoot, eventWithSameId)

        await expect(overwriting).rejects.toThrow("EEXIST")
        expect(await listEvents(projectRoot)).toEqual([questionSent])
    })
})
