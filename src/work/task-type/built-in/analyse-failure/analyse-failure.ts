import { z } from "zod"
import { getEventOfType } from "../../../../journal/get-event-of-type.ts"
import type { JournalEvent } from "../../../../journal/schema.ts"
import { formatPositionLabel } from "../../../../messaging/message/format-position-label.ts"
import { loadTicket } from "../../../../messaging/ticket/storage.ts"
import { listPositions } from "../../../../organization/position/storage.ts"
import { companyRelaunchedEventType } from "../../../pause/schema.ts"
import { getTaskPositionId } from "../../../task/get-task-position-id.ts"
import { TaskIdSchema, taskFailedEventType } from "../../../task/schema.ts"
import { listTasks } from "../../../task/storage.ts"
import { type BoundToolInputs, defineTaskType } from "../../define-task-type.ts"

const instructions =
    "The company is paused since. Find out what went wrong, and readjust what was missing with AICo's commands: the position's title or description, its employee, the model or the provider it runs on. Then relaunch the company with `aico company relaunch`: the position that has the ticket's hand gets its task again."

function isRelaunchedSince(
    events: readonly JournalEvent[],
    failedEvent: JournalEvent,
): boolean {
    const failureIndex = events.findIndex(({ id }) => id === failedEvent.id)
    return events
        .slice(failureIndex + 1)
        .some(({ type }) => type === companyRelaunchedEventType.type)
}

export const analyseFailureTaskType = defineTaskType({
    type: "analyse-failure",
    paramsSchema: z.strictObject({ taskId: TaskIdSchema }),
    resultSchema: z.strictObject({}),
    async createSession({ taskId }, { projectRoot, causeEvent }) {
        const [tasks, positions] = await Promise.all([
            listTasks(projectRoot),
            listPositions(projectRoot),
        ])
        const failedTask = tasks.find(({ id }) => id === taskId)
        const reason = getEventOfType(causeEvent, taskFailedEventType)?.reason
        const positionId =
            failedTask && getTaskPositionId(failedTask, positions)
        const position = positions.find(({ id }) => id === positionId)
        const positionLabel = position
            ? formatPositionLabel(position)
            : `@${positionId}`
        const lines = [
            `Task "${taskId}", ${failedTask?.type}, of ${positionLabel}, failed: ${reason}`,
        ]
        const { ticketNumber } = failedTask?.params ?? {}
        const boundToolInputs: BoundToolInputs = {}
        if (typeof ticketNumber === "number") {
            const ticket = await loadTicket(projectRoot, ticketNumber)
            lines.push(
                `It worked on ticket #${ticket.number}, "${ticket.title}": ticket_show reads its discussion, and ticket_close closes it as failed, should its request not be met.`,
            )
            boundToolInputs.ticket_close = { ticketNumber }
            boundToolInputs.ticket_show = { ticketNumber }
        }
        return {
            userMessage: [...lines, "", instructions].join("\n"),
            toolNames:
                typeof ticketNumber === "number"
                    ? ["ticket_close", "ticket_show"]
                    : [],
            boundToolInputs,
            result: {},
        }
    },
    async getCancellationReason(_params, { journal, causeEvent }) {
        return isRelaunchedSince(journal.events, causeEvent)
            ? "The company was relaunched since the failure."
            : undefined
    },
})
