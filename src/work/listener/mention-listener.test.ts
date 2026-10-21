import { describe, expect, test } from "bun:test"
import type { EventOfType } from "../../journal/schema.ts"
import type { messageSentEventType } from "../../messaging/message/schema.ts"
import { mentionListener } from "./mention-listener.ts"

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
        mentions,
    }
}

function getNewTasks(mentions: string[]) {
    return mentionListener.getNewTasks(createMessageSentEvent(mentions))
}

describe("mentionListener", () => {
    test("asks each position a message mentions to catch up on its thread", () => {
        const newTasks = getNewTasks(["backend-developer", "qa-tester"])

        expect(newTasks).toEqual([
            {
                type: "catch-up-thread",
                positionId: "backend-developer",
                params: { threadId },
            },
            {
                type: "catch-up-thread",
                positionId: "qa-tester",
                params: { threadId },
            },
        ])
    })

    test("asks nothing for a message without mentions", () => {
        expect(getNewTasks([])).toEqual([])
    })
})
