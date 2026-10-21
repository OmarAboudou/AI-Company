import { listEvents } from "../../journal/storage.ts"
import { listPositions } from "../../organization/position/storage.ts"
import { getTaskPositionId } from "./get-task-position-id.ts"
import { getTaskStates } from "./get-task-states.ts"
import { isPendingTask } from "./is-pending-task.ts"
import { listTasks } from "./storage.ts"

export async function loadPendingPositionIdsByThread(
    projectRoot: string,
): Promise<Map<string, string[]>> {
    const [tasks, events, positions] = await Promise.all([
        listTasks(projectRoot),
        listEvents(projectRoot),
        listPositions(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, events)
    const pendingPositionIdsByThread = new Map<string, string[]>()
    for (const task of tasks) {
        const { threadId } = task.params
        if (typeof threadId !== "string" || !isPendingTask(task, taskStates)) {
            continue
        }
        const positionId = getTaskPositionId(task, positions)
        const positionIds = pendingPositionIdsByThread.get(threadId) ?? []
        if (!positionIds.includes(positionId)) {
            pendingPositionIdsByThread.set(threadId, [
                ...positionIds,
                positionId,
            ])
        }
    }
    return pendingPositionIdsByThread
}
