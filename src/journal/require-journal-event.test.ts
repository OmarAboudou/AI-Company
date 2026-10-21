import { describe, expect, test } from "bun:test"
import { UserError } from "../user-error.ts"
import { requireJournalEvent } from "./require-journal-event.ts"

const noteWritten = {
    id: "20261018-140322-123-5d1e",
    type: "note-written",
    occurredAt: "2026-10-18T14:03:22.123Z",
    depth: 0,
}

const journal = { projectRoot: "/tmp/acme", events: [noteWritten] }

describe("requireJournalEvent", () => {
    test("finds an event of the journal by its id", () => {
        expect(requireJournalEvent(journal, noteWritten.id)).toBe(noteWritten)
    })

    test("refuses an id that names no event, saying which file is missing", () => {
        const missingEventId = "20261018-150000-000-9e3f"

        const requiring = () => requireJournalEvent(journal, missingEventId)

        expect(requiring).toThrow(UserError)
        expect(requiring).toThrow(`.llmco/journal/${missingEventId}.json`)
    })
})
