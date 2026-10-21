import { recordEvent } from "../../../../journal/record-event.ts"
import { listEvents, loadEvent } from "../../../../journal/storage.ts"
import type { Message } from "../../../../messaging/message/schema.ts"
import { listPositions } from "../../../../organization/position/storage.ts"
import { getTaskPositionId } from "../../../task/get-task-position-id.ts"
import { getTaskStates } from "../../../task/get-task-states.ts"
import { isPendingTask } from "../../../task/is-pending-task.ts"
import { type Task, taskDoneEventType } from "../../../task/schema.ts"
import { listTasks } from "../../../task/storage.ts"

export async function markCatchUpsAsDone(
    projectRoot: string,
    { positionId, message }: { positionId: string; message: Message },
): Promise<Task[]> {
    const [tasks, events, positions] = await Promise.all([
        listTasks(projectRoot),
        listEvents(projectRoot),
        listPositions(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, events)
    const catchUps = tasks.filter(
        (task) =>
            task.type === "catch-up-thread" &&
            task.params.threadId === message.threadId &&
            getTaskPositionId(task, positions) === positionId &&
            isPendingTask(task, taskStates),
    )
    for (const task of catchUps) {
        const causeEvent = await loadEvent(projectRoot, task.causeEventId)
        await recordEvent(projectRoot, taskDoneEventType, {
            depth: causeEvent.depth + 1,
            taskId: task.id,
            summary: "Sent a message in the thread.",
            lastReadEntryId: message.id,
        })
    }
    return catchUps
}
