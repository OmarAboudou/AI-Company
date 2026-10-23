import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import { recordEvent } from "./record-event.ts"
import { defineEventType, type Journal } from "./schema.ts"
import { listEvents, loadJournal } from "./storage.ts"

let projectRoot: string
let journal: Journal

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
    journal = await loadJournal(projectRoot)
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const noteWrittenEventType = defineEventType({
    type: "note-written",
    description: "A note was written.",
    fields: { text: z.string().min(1) },
})

const noteWritten = { depth: 0, text: "Hono runs on Bun." }

function recordNoteWritten() {
    return recordEvent(journal, noteWrittenEventType, noteWritten)
}

describe("recordEvent", () => {
    test("saves the event, of its type, with the time it happens", async () => {
        const clockTime = Date.now()

        const event = await recordNoteWritten()

        expect(event).toMatchObject({ type: "note-written", ...noteWritten })
        expect(Date.parse(event.occurredAt)).toBeGreaterThanOrEqual(clockTime)
        expect(await listEvents(projectRoot)).toEqual([event])
    })

    test("adds the event to the journal's view", async () => {
        const event = await recordNoteWritten()

        expect(journal.events).toEqual([event])
    })

    test("refuses an event that its type's schema rejects", async () => {
        const invalidNoteWritten = { ...noteWritten, text: "" }

        const recording = recordEvent(
            journal,
            noteWrittenEventType,
            invalidNoteWritten,
        )

        await expect(recording).rejects.toThrow("Too small")
        expect(await listEvents(projectRoot)).toEqual([])
        expect(journal.events).toEqual([])
    })

    test("refuses a field that its type doesn't define", async () => {
        const noteWrittenWithPriority = { ...noteWritten, priority: "high" }

        const recording = recordEvent(
            journal,
            noteWrittenEventType,
            noteWrittenWithPriority,
        )

        await expect(recording).rejects.toThrow("Unrecognized key")
        expect(await listEvents(projectRoot)).toEqual([])
    })

    test("keeps the order of recording, even within a millisecond", async () => {
        const recordedEvents = await Promise.all(
            Array.from({ length: 20 }, recordNoteWritten),
        )

        expect(await listEvents(projectRoot)).toEqual(recordedEvents)
    })
})
