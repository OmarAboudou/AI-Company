import { messageSentEventType } from "../../messaging/message/schema.ts"
import { catchUpThreadTypeName } from "../task-type/built-in/catch-up-thread/schema.ts"
import { defineListener } from "./define-listener.ts"

export const mentionListener = defineListener({
    eventType: messageSentEventType,
    getTasksToCreate: ({ threadId, mentions }) =>
        mentions.map((positionId) => ({
            type: catchUpThreadTypeName,
            positionId,
            params: { threadId },
        })),
})
