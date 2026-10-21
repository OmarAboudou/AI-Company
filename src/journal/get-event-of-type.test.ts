import { describe, expect, test } from "bun:test"
import { UserError } from "../user-error.ts"
import { getEventOfType } from "./get-event-of-type.ts"
import {
    type EventOfType,
    messageSentEventType,
    taskCreatedEventType,
} from "./schema.ts"

const questionSent: EventOfType<typeof messageSentEventType> = {
    id: "20261018-140322-123-5d1e",
    type: "message-sent",
    occurredAt: "2026-10-18T14:03:22.123Z",
    depth: 0,
    threadId: "2026-10-18-choice-of-framework",
    messageId: "20261018-140322-123-3f9a",
    mentions: ["backend-developer"],
}

describe("getEventOfType", () => {
    test("gives an event of the type, checked against its schema", () => {
        const event = getEventOfType(questionSent, messageSentEventType)

        expect(event).toEqual(questionSent)
    })

    test("gives nothing for an event of another type", () => {
        const event = getEventOfType(questionSent, taskCreatedEventType)

        expect(event).toBeUndefined()
    })

    test("refuses an event of the type that its schema rejects", () => {
        const invalidEvent = { ...questionSent, mentions: ["QA Tester"] }
        const refusalMessage =
            "Invalid .llmco/journal/20261018-140322-123-5d1e.json:"

        const getting = () => getEventOfType(invalidEvent, messageSentEventType)

        expect(getting).toThrow(UserError)
        expect(getting).toThrow(refusalMessage)
    })
})
