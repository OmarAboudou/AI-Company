import { messageSentEventType } from "../../messaging/message/schema.ts"
import { defineListener } from "./define-listener.ts"

export const mentionListener = defineListener({
    eventType: messageSentEventType,
    getTasksToCreate: ({ threadId, mentions }) =>
        mentions.map((positionId) => ({
            type: "catch-up-thread",
            positionId,
            params: { threadId },
        })),
})
