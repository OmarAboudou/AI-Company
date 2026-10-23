import { assigneeInstructions } from "../assignee-instructions.ts"
import { formatTicketPositionLabel } from "../build-ticket-message.ts"
import { defineTicketTaskType } from "../define-ticket-task-type.ts"

export const resumeTaskType = defineTicketTaskType({
    type: "resume",
    status: "open",
    toolNames: ["ticket_ask", "ticket_deliver"],
    buildIntroduction: (situation) => {
        const { ticket, state } = situation
        const requesterLabel = formatTicketPositionLabel(
            situation,
            state.requesterPositionId,
        )
        return `Resume your work on ticket #${ticket.number}, which ${requesterLabel} asked of you:`
    },
    instructions: assigneeInstructions,
})
