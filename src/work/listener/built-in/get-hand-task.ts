import type { TicketState } from "../../../messaging/ticket/get-ticket-states.ts"
import { analyseRenouncementTaskType } from "../../task-type/built-in/analyse-renouncement/analyse-renouncement.ts"
import { answerTaskType } from "../../task-type/built-in/answer/answer.ts"
import { resumeTaskType } from "../../task-type/built-in/resume/resume.ts"
import { validateTaskType } from "../../task-type/built-in/validate/validate.ts"

export function getHandTask(state: TicketState, founderPositionId: string) {
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
        case "to-arbitrate":
            return {
                positionId: founderPositionId,
                taskType: analyseRenouncementTaskType,
            }
        case "closed":
            return undefined
    }
}
