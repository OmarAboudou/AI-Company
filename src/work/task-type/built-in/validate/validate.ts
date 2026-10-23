import { formatTicketPositionLabel } from "../build-ticket-message.ts"
import { defineTicketTaskType } from "../define-ticket-task-type.ts"

export const validateTaskType = defineTicketTaskType({
    type: "validate",
    toolNames: ["ticket_validate", "ticket_refuse", "ticket_cancel"],
    buildIntroduction: (situation) => {
        const { ticket, state } = situation
        const assigneeLabel = formatTicketPositionLabel(
            situation,
            state.assigneePositionId,
        )
        return `${assigneeLabel} delivered ticket #${ticket.number}, which you asked of it:`
    },
    instructions:
        "Check the delivery against the request, then validate it with ticket_validate, or refuse it with ticket_refuse, saying what is missing.",
})
