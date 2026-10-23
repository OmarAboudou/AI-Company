import { formatTicketPositionLabel } from "../build-ticket-message.ts"
import { defineTicketTaskType } from "../define-ticket-task-type.ts"

export const analyseRenouncementTaskType = defineTicketTaskType({
    type: "analyse-renouncement",
    status: "to-arbitrate",
    toolNames: ["ticket_hand-over", "ticket_close"],
    buildIntroduction: (situation) => {
        const { ticket, state } = situation
        const assigneeLabel = formatTicketPositionLabel(
            situation,
            state.assigneePositionId,
        )
        return `${assigneeLabel} renounced ticket #${ticket.number}, which paused the company:`
    },
    instructions:
        "Find out what went wrong from what it says, and readjust what was missing with AICo's commands: the position's title or description, its employee, the model or the provider it runs on. Then arbitrate: hand the ticket over to another position with ticket_hand-over, or close it as failed with ticket_close. Relaunch the company with `aico company relaunch` once ready.",
})
