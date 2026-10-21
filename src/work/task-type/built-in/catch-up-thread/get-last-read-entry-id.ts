import type { IdHistory } from "../../../../ids/id-history-schema.ts"
import { getEventOfType } from "../../../../journal/get-event-of-type.ts"
import type { JournalEvent } from "../../../../journal/schema.ts"
import { getTaskPositionId } from "../../../task/get-task-position-id.ts"
import { getTaskResult } from "../../../task/get-task-result.ts"
import { type Task, taskDoneEventType } from "../../../task/schema.ts"
import {
    CatchUpThreadResultReadingSchema,
    catchUpThreadTypeName,
} from "./schema.ts"

export function getLastReadEntryId(
    tasks: Task[],
    events: JournalEvent[],
    positions: IdHistory[],
    { positionId, threadId }: { positionId: string; threadId: string },
): string | undefined {
    const catchUpTaskIds = new Set(
        tasks
            .filter(
                (task) =>
                    task.type === catchUpThreadTypeName &&
                    task.params.threadId === threadId &&
                    getTaskPositionId(task, positions) === positionId,
            )
            .map(({ id }) => id),
    )
    let lastReadEntryId: string | undefined
    for (const event of events) {
        const taskDoneEvent = getEventOfType(event, taskDoneEventType)
        if (
            taskDoneEvent === undefined ||
            !catchUpTaskIds.has(taskDoneEvent.taskId)
        ) {
            continue
        }
        const result = getTaskResult(
            taskDoneEvent,
            CatchUpThreadResultReadingSchema,
        )
        lastReadEntryId = result.lastReadEntryId ?? lastReadEntryId
    }
    return lastReadEntryId
}
