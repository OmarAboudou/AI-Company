import type { Journal } from "../../journal/schema.ts"
import { listPositions } from "../../organization/position/storage.ts"
import { getTaskPositionId } from "./get-task-position-id.ts"
import { getTaskStates } from "./get-task-states.ts"
import { isPendingTask } from "./is-pending-task.ts"
import { listTasks } from "./storage.ts"

export async function loadPendingPositionIdsByTicket(
    journal: Journal,
): Promise<Map<number, string[]>> {
    const { projectRoot } = journal
    const [tasks, positions] = await Promise.all([
        listTasks(projectRoot),
        listPositions(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, journal.events)
    const pendingPositionIdsByTicket = new Map<number, string[]>()
    for (const task of tasks) {
        const { ticketNumber } = task.params
        if (
            typeof ticketNumber !== "number" ||
            !isPendingTask(task, taskStates)
        ) {
            continue
        }
        const positionId = getTaskPositionId(task, positions)
        const positionIds = pendingPositionIdsByTicket.get(ticketNumber) ?? []
        if (!positionIds.includes(positionId)) {
            pendingPositionIdsByTicket.set(ticketNumber, [
                ...positionIds,
                positionId,
            ])
        }
    }
    return pendingPositionIdsByTicket
}
