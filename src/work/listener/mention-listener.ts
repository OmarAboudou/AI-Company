import { messageSentEventType } from "../../journal/schema.ts"
import { defineListener } from "./define-listener.ts"

export const mentionListener = defineListener({
    eventType: messageSentEventType,
    getNewTasks: ({ threadId, mentions }) =>
        mentions.map((positionId) => ({
            type: "catch-up-thread",
            positionId,
            params: { threadId },
        })),
})
