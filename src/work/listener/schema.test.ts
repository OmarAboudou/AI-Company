import { describe, expect, test } from "bun:test"
import { chainStoppedEventType } from "./schema.ts"

function isAccepted(event: unknown): boolean {
    return chainStoppedEventType.schema.safeParse(event).success
}

describe("chainStoppedEventType", () => {
    const chainStoppedEvent = {
        type: "chain-stopped",
        occurredAt: "2026-10-18T15:00:00.000Z",
        depth: 200,
        causeEventId: "20261018-145959-000-4b1d",
        stoppedTask: {
            type: "catch-up-thread",
            positionId: "qa-tester",
            params: { threadId: "2026-10-18-choice-of-framework" },
        },
    }

    test("accepts a chain stopped, with the task it didn't create", () => {
        expect(isAccepted(chainStoppedEvent)).toBe(true)
    })

    test("requires the task the chain stopped before", () => {
        const { stoppedTask, ...event } = chainStoppedEvent

        expect(isAccepted(event)).toBe(false)
    })
})
