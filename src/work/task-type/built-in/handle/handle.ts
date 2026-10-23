import { assigneeInstructions } from "../assignee-instructions.ts"
import { formatTicketPositionLabel } from "../build-ticket-message.ts"
import { defineTicketTaskType } from "../define-ticket-task-type.ts"

export const handleTaskType = defineTicketTaskType({
    type: "handle",
    status: "open",
    toolNames: ["ticket_ask", "ticket_deliver"],
    buildIntroduction: (situation) => {
        const { ticket, state } = situation
        const requesterLabel = formatTicketPositionLabel(
            situation,
            state.requesterPositionId,
        )
        return `${requesterLabel} asks you for work, in ticket #${ticket.number}:`
    },
    instructions: assigneeInstructions,
})
