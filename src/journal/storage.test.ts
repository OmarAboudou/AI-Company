import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
    listEvents,
    loadJournal,
    refreshJournal,
    saveEvent,
    watchJournal,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
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
            ".aico",
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
        const ticketStarred = {
            ...firstNoteWritten,
            type: "ticket-starred",
            starredBy: "director",
        }
        await saveEvent(projectRoot, ticketStarred)

        expect(await listEvents(projectRoot)).toEqual([ticketStarred])
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

describe("loadJournal and refreshJournal", () => {
    test("load every event into a view of the journal, oldest first", async () => {
        await saveEvent(projectRoot, secondNoteWritten)
        await saveEvent(projectRoot, firstNoteWritten)

        const journal = await loadJournal(projectRoot)

        expect(journal).toEqual({
            projectRoot,
            events: [firstNoteWritten, secondNoteWritten],
        })
    })

    test("refresh adds only the events written since, each in its place", async () => {
        await saveEvent(projectRoot, secondNoteWritten)
        const journal = await loadJournal(projectRoot)
        const thirdNoteWritten = {
            ...secondNoteWritten,
            id: "20261018-140400-000-9e3f",
        }
        await saveEvent(projectRoot, firstNoteWritten)
        await saveEvent(projectRoot, thirdNoteWritten)

        const newEvents = await refreshJournal(journal)

        expect(newEvents).toEqual([firstNoteWritten, thirdNoteWritten])
        expect(journal.events).toEqual([
            firstNoteWritten,
            secondNoteWritten,
            thirdNoteWritten,
        ])
    })

    test("refresh adds nothing when nothing was written since", async () => {
        await saveEvent(projectRoot, firstNoteWritten)
        const journal = await loadJournal(projectRoot)

        expect(await refreshJournal(journal)).toEqual([])
        expect(journal.events).toEqual([firstNoteWritten])
    })
})

describe("watchJournal", () => {
    test("tells of the next event saved in the journal", async () => {
        const journalWatch = await watchJournal(projectRoot)
        const change = journalWatch.waitForChange()

        await saveEvent(projectRoot, firstNoteWritten)

        try {
            await expect(change).resolves.toBeUndefined()
        } finally {
            journalWatch.stop()
        }
    })

    test("tells at once of an event saved before the wait", async () => {
        const journalWatch = await watchJournal(projectRoot)
        await saveEvent(projectRoot, firstNoteWritten)
        await journalWatch.waitForChange()

        const change = journalWatch.waitForChange()

        try {
            await expect(change).resolves.toBeUndefined()
        } finally {
            journalWatch.stop()
        }
    })
})
