import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { UserError } from "../user-error.ts"
import { getEventOfType } from "./get-event-of-type.ts"
import { defineEventType, type EventOfType } from "./schema.ts"

const noteWrittenEventType = defineEventType({
    type: "note-written",
    description: "A note was written.",
    fields: { text: z.string().min(1) },
})

const noteErasedEventType = defineEventType({
    type: "note-erased",
    description: "A note was erased.",
    fields: {},
})

const noteFiledEventType = defineEventType({
    type: "note-filed",
    description: "A note was filed.",
    fields: {
        folder: z.strictObject({ name: z.string() }),
        tags: z.array(z.strictObject({ label: z.string() })),
        reviewer: z.strictObject({ id: z.string() }).optional(),
    },
})

const noteWritten: EventOfType<typeof noteWrittenEventType> = {
    id: "20261018-140322-123-5d1e",
    type: "note-written",
    occurredAt: "2026-10-18T14:03:22.123Z",
    depth: 0,
    text: "Hono runs on Bun.",
}

const noteFiled: EventOfType<typeof noteFiledEventType> = {
    id: "20261018-140323-000-77aa",
    type: "note-filed",
    occurredAt: "2026-10-18T14:03:23.000Z",
    depth: 0,
    folder: { name: "Stack" },
    tags: [{ label: "bun" }],
    reviewer: { id: "backend-developer" },
}

describe("getEventOfType", () => {
    test("gives an event of the type, checked against its schema", () => {
        const event = getEventOfType(noteWritten, noteWrittenEventType)

        expect(event).toEqual(noteWritten)
    })

    test("gives nothing for an event of another type", () => {
        const event = getEventOfType(noteWritten, noteErasedEventType)

        expect(event).toBeUndefined()
    })

    test("refuses an event of the type that its schema rejects", () => {
        const invalidEvent = { ...noteWritten, text: "" }
        const refusalMessage =
            "Invalid .aico/journal/20261018-140322-123-5d1e.json:"

        const getting = () => getEventOfType(invalidEvent, noteWrittenEventType)

        expect(getting).toThrow(UserError)
        expect(getting).toThrow(refusalMessage)
    })

    test("ignores the fields a newer llmco added, at any depth", () => {
        const noteFiledByNewerLlmco = {
            ...noteFiled,
            priority: "high",
            folder: { name: "Stack", color: "blue" },
            tags: [{ label: "bun", weight: 2 }],
            reviewer: { id: "backend-developer", since: "2026-10-18" },
        }

        const event = getEventOfType(noteFiledByNewerLlmco, noteFiledEventType)

        expect(event).toEqual(noteFiled)
    })
})
