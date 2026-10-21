import { messageSentEventType } from "../../messaging/message/schema.ts"
import { catchUpThreadTaskType } from "../task-type/built-in/catch-up-thread/catch-up-thread.ts"
import { createUncreatedTask } from "../task-type/create-uncreated-task.ts"
import { defineListener } from "./define-listener.ts"

export const mentionListener = defineListener({
    eventType: messageSentEventType,
    getTasksToCreate: ({ threadId, mentions }) =>
        mentions.map((positionId) =>
            createUncreatedTask(catchUpThreadTaskType, {
                positionId,
                params: { threadId },
            }),
        ),
})
