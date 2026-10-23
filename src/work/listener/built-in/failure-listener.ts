import { taskFailedEventType } from "../../task/schema.ts"
import { analyseFailureTaskType } from "../../task-type/built-in/analyse-failure/analyse-failure.ts"
import { createUncreatedTask } from "../../task-type/create-uncreated-task.ts"
import { defineListener } from "../define-listener.ts"

export const failureListener = defineListener({
    eventType: taskFailedEventType,
    getEffects: ({ taskId }, { founderPositionId }) => [
        {
            kind: "create-task",
            task: createUncreatedTask(analyseFailureTaskType, {
                positionId: founderPositionId,
                params: { taskId },
            }),
        },
    ],
})
