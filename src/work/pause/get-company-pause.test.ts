import { describe, expect, test } from "bun:test"
import type { JournalEvent } from "../../journal/schema.ts"
import { getCompanyPause } from "./get-company-pause.ts"

function createEvent(type: string, minute: number): JournalEvent {
    const occurredAt = `2026-10-24T09:${String(minute).padStart(2, "0")}:00.000Z`
    return { id: `20261024-09${minute}00-000-0a1b`, type, occurredAt, depth: 0 }
}

describe("getCompanyPause", () => {
    test("finds no pause in a company never paused", () => {
        expect(getCompanyPause([createEvent("ticket-created", 1)])).toBe(
            undefined,
        )
    })

    test("finds the pause from the first pausing event", () => {
        const events = [
            createEvent("ticket-created", 1),
            createEvent("company-paused", 2),
            createEvent("ticket-created", 3),
        ]

        expect(getCompanyPause(events)).toEqual({
            pausedAt: "2026-10-24T09:02:00.000Z",
        })
    })

    test("ends the pause at the relaunch, until the next pause", () => {
        const relaunchedEvents = [
            createEvent("company-paused", 1),
            createEvent("company-relaunched", 2),
        ]
        const pausedAgainEvents = [
            ...relaunchedEvents,
            createEvent("company-paused", 3),
        ]

        expect(getCompanyPause(relaunchedEvents)).toBe(undefined)
        expect(getCompanyPause(pausedAgainEvents)).toEqual({
            pausedAt: "2026-10-24T09:03:00.000Z",
        })
    })
})
