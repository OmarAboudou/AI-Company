import type { TicketState } from "../../../messaging/ticket/get-ticket-states.ts"
import { getTaskPositionId } from "../../task/get-task-position-id.ts"
import { taskDoneEventType } from "../../task/schema.ts"
import { answerTaskType } from "../../task-type/built-in/answer/answer.ts"
import { resumeTaskType } from "../../task-type/built-in/resume/resume.ts"
import { validateTaskType } from "../../task-type/built-in/validate/validate.ts"
import { createUncreatedTask } from "../../task-type/create-uncreated-task.ts"
import { defineListener } from "../define-listener.ts"

function getHandTask(state: TicketState) {
    switch (state.status) {
        case "open":
            return {
                positionId: state.assigneePositionId,
                taskType: resumeTaskType,
            }
        case "waiting":
            return {
                positionId: state.requesterPositionId,
                taskType: answerTaskType,
            }
        case "to-validate":
            return {
                positionId: state.requesterPositionId,
                taskType: validateTaskType,
            }
        case "closed":
            return undefined
    }
}

// A session that stops without passing the hand leaves the ticket to the
// same position, which takes it up again in a session of its own.
export const sessionEndListener = defineListener({
    eventType: taskDoneEventType,
    getEffects: (
        { taskId, hasPassedHand },
        { tasks, positions, ticketStates },
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
        const handTask = state && getHandTask(state)
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
