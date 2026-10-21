import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listEvents, saveEvent } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const firstNoteWritten = {
    id: "20261018-140322-123-5d1e",
    type: "note-written",
    occurredAt: "2026-10-18T14:03:22.123Z",
    depth: 0,
    text: "Hono runs on Bun.",
}

const secondNoteWritten = {
    ...firstNoteWritten,
    id: "20261018-140351-000-8c2a",
    occurredAt: "2026-10-18T14:03:51.000Z",
    depth: 1,
    text: "Express doesn't.",
}

describe("saveEvent and listEvents", () => {
    test("write the event in the journal, then read it back", async () => {
        await saveEvent(projectRoot, firstNoteWritten)

        const eventPath = join(
            projectRoot,
            ".llmco",
            "journal",
            `${firstNoteWritten.id}.json`,
        )
        const { id, ...content } = firstNoteWritten
        expect(await Bun.file(eventPath).json()).toEqual(content)
        expect(await listEvents(projectRoot)).toEqual([firstNoteWritten])
    })

    test("list returns the events oldest first", async () => {
        await saveEvent(projectRoot, secondNoteWritten)
        await saveEvent(projectRoot, firstNoteWritten)

        expect(await listEvents(projectRoot)).toEqual([
            firstNoteWritten,
            secondNoteWritten,
        ])
    })

    test("list is empty before the first event", async () => {
        expect(await listEvents(projectRoot)).toEqual([])
    })

    test("list keeps every event, whatever its type and fields", async () => {
        const threadClosed = {
            ...firstNoteWritten,
            type: "thread-closed",
            reason: "Decided: Hono.",
        }
        await saveEvent(projectRoot, threadClosed)

        expect(await listEvents(projectRoot)).toEqual([threadClosed])
    })

    test("save never overwrites an event", async () => {
        await saveEvent(projectRoot, firstNoteWritten)
        const eventWithSameId = {
            ...secondNoteWritten,
            id: firstNoteWritten.id,
        }

        const overwriting = saveEvent(projectRoot, eventWithSameId)

        await expect(overwriting).rejects.toThrow("EEXIST")
        expect(await listEvents(projectRoot)).toEqual([firstNoteWritten])
    })
})
