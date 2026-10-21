import { describe, expect, test } from "bun:test"
import type { EventOfType } from "../../journal/schema.ts"
import type { messageSentEventType } from "../../messaging/message/schema.ts"
import { catchUpListener } from "./catch-up-listener.ts"

const threadId = "2026-10-18-choice-of-framework"

function createMessageSentEvent(
    mentions: string[],
): EventOfType<typeof messageSentEventType> {
    return {
        id: "20261018-140322-123-5d1e",
        type: "message-sent",
        occurredAt: "2026-10-18T14:03:22.123Z",
        depth: 0,
        threadId,
        messageId: "20261018-140322-123-3f9a",
        positionId: "director",
        mentions,
    }
}

function getEffects(mentions: string[]) {
    return catchUpListener.getEffects(createMessageSentEvent(mentions))
}

describe("catchUpListener", () => {
    test("asks each position a message mentions to catch up on its thread", () => {
        const effects = getEffects(["backend-developer", "qa-tester"])

        expect(effects).toEqual([
            {
                kind: "create-task",
                task: {
                    type: "catch-up-thread",
                    positionId: "backend-developer",
                    params: { threadId },
                },
            },
            {
                kind: "create-task",
                task: {
                    type: "catch-up-thread",
                    positionId: "qa-tester",
                    params: { threadId },
                },
            },
        ])
    })

    test("asks nothing for a message without mentions", () => {
        expect(getEffects([])).toEqual([])
    })
})
