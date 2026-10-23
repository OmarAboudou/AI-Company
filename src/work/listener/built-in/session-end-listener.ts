import { getTaskPositionId } from "../../task/get-task-position-id.ts"
import { taskDoneEventType } from "../../task/schema.ts"
import { createUncreatedTask } from "../../task-type/create-uncreated-task.ts"
import { defineListener } from "../define-listener.ts"
import { getHandTask } from "./get-hand-task.ts"

// A session that stops without passing the hand leaves the ticket to the
// same position, which takes it up again in a session of its own.
export const sessionEndListener = defineListener({
    eventType: taskDoneEventType,
    getEffects: (
        { taskId, hasPassedHand },
        { founderPositionId, tasks, positions, ticketStates },
    ) => {
        const task = tasks.find(({ id }) => id === taskId)
        const ticketNumber = task?.params.ticketNumber
        if (
            hasPassedHand ||
            task === undefined ||
            typeof ticketNumber !== "number"
        ) {
            return []
        }
        const state = ticketStates.get(ticketNumber)
        const handTask = state && getHandTask(state, founderPositionId)
        if (handTask?.positionId !== getTaskPositionId(task, positions)) {
            return []
        }
        const uncreatedTask = createUncreatedTask(handTask.taskType, {
            positionId: handTask.positionId,
            params: { ticketNumber },
        })
        return [{ kind: "create-task", task: uncreatedTask }]
    },
})
