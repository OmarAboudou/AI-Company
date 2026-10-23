import { formatTicketPositionLabel } from "../build-ticket-message.ts"
import { defineTicketTaskType } from "../define-ticket-task-type.ts"

export const answerTaskType = defineTicketTaskType({
    type: "answer",
    toolNames: ["ticket_answer", "ticket_cancel"],
    buildIntroduction: (situation) => {
        const { ticket, state } = situation
        const assigneeLabel = formatTicketPositionLabel(
            situation,
            state.assigneePositionId,
        )
        return `${assigneeLabel} asks you a question on ticket #${ticket.number}, which you asked of it:`
    },
    instructions:
        "Answer it with ticket_answer. If its request no longer holds, cancel the ticket with ticket_cancel, saying why.",
})
