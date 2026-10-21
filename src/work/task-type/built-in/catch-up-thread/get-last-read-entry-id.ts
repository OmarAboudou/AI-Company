import type { IdHistory } from "../../../../ids/id-history-schema.ts"
import { getEventOfType } from "../../../../journal/get-event-of-type.ts"
import type { JournalEvent } from "../../../../journal/schema.ts"
import { getTaskPositionId } from "../../../task/get-task-position-id.ts"
import { type Task, taskCompletedEventType } from "../../../task/schema.ts"

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
                    task.type === "catch-up-thread" &&
                    task.params.threadId === threadId &&
                    getTaskPositionId(task, positions) === positionId,
            )
            .map(({ id }) => id),
    )
    let lastReadEntryId: string | undefined
    for (const event of events) {
        const taskCompletedEvent = getEventOfType(event, taskCompletedEventType)
        if (
            taskCompletedEvent?.lastReadEntryId !== undefined &&
            catchUpTaskIds.has(taskCompletedEvent.taskId)
        ) {
            lastReadEntryId = taskCompletedEvent.lastReadEntryId
        }
    }
    return lastReadEntryId
}
