import { messageSentEventType } from "../../messaging/message/schema.ts"
import { catchUpThreadTaskType } from "../task-type/built-in/catch-up-thread/catch-up-thread.ts"
import { createUncreatedTask } from "../task-type/create-uncreated-task.ts"
import { defineListener } from "./define-listener.ts"

export const catchUpListener = defineListener({
    eventType: messageSentEventType,
    getEffects: ({ threadId, mentions }) =>
        mentions.map((positionId) => ({
            kind: "create-task",
            task: createUncreatedTask(catchUpThreadTaskType, {
                positionId,
                params: { threadId },
            }),
        })),
})
