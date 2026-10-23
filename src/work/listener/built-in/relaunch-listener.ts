import { getEventOfType } from "../../../journal/get-event-of-type.ts"
import type { JournalEvent } from "../../../journal/schema.ts"
import { companyRelaunchedEventType } from "../../pause/schema.ts"
import { getTaskPositionId } from "../../task/get-task-position-id.ts"
import { isPendingTask } from "../../task/is-pending-task.ts"
import { taskFailedEventType } from "../../task/schema.ts"
import { createUncreatedTask } from "../../task-type/create-uncreated-task.ts"
import { defineListener, type ListenerEffect } from "../define-listener.ts"
import { getHandTask } from "./get-hand-task.ts"

function getPauseEvents(
    events: readonly JournalEvent[],
    relaunchedEventId: string,
): readonly JournalEvent[] {
    const relaunchIndex = events.findIndex(({ id }) => id === relaunchedEventId)
    const previousRelaunchIndex = events
        .slice(0, relaunchIndex)
        .findLastIndex(({ type }) => type === companyRelaunchedEventType.type)
    return events.slice(previousRelaunchIndex + 1, relaunchIndex)
}

// A failure leaves its ticket as it was: at the relaunch, the position that
// has its hand gets its task again, unless the ticket was closed or that
// position already has a task on it.
export const relaunchListener = defineListener({
    eventType: companyRelaunchedEventType,
    getEffects: (
        { id },
        {
            events,
            founderPositionId,
            tasks,
            taskStates,
            positions,
            ticketStates,
        },
    ) => {
        const failedTaskIds = getPauseEvents(events, id).flatMap((event) => {
            const failedEvent = getEventOfType(event, taskFailedEventType)
            return failedEvent === undefined ? [] : [failedEvent.taskId]
        })
        const ticketNumbers = new Set(
            tasks
                .filter(({ id: taskId }) => failedTaskIds.includes(taskId))
                .map(({ params }) => params.ticketNumber)
                .filter((ticketNumber) => typeof ticketNumber === "number"),
        )
        return [...ticketNumbers].flatMap((ticketNumber): ListenerEffect[] => {
            const state = ticketStates.get(ticketNumber)
            const handTask = state && getHandTask(state, founderPositionId)
            const hasPendingTask = tasks.some(
                (task) =>
                    task.params.ticketNumber === ticketNumber &&
                    isPendingTask(task, taskStates) &&
                    getTaskPositionId(task, positions) === handTask?.positionId,
            )
            if (handTask === undefined || hasPendingTask) {
                return []
            }
            const uncreatedTask = createUncreatedTask(handTask.taskType, {
                positionId: handTask.positionId,
                params: { ticketNumber },
            })
            return [{ kind: "create-task", task: uncreatedTask }]
        })
    },
})
