import { getEventOfType } from "../../../journal/get-event-of-type.ts"
import type { Message } from "../../../messaging/message/schema.ts"
import { listMessages } from "../../../messaging/message/storage.ts"
import {
    getTicketStates,
    type TicketState,
} from "../../../messaging/ticket/get-ticket-states.ts"
import { loadExistingTicket } from "../../../messaging/ticket/load-existing-ticket.ts"
import type { Ticket } from "../../../messaging/ticket/schema.ts"
import type { Position } from "../../../organization/position/schema.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { getTaskPositionId } from "../../task/get-task-position-id.ts"
import { type Task, taskStartedEventType } from "../../task/schema.ts"
import { listTasks } from "../../task/storage.ts"
import type { TaskTypeContext } from "../define-task-type.ts"

export type TicketSituation = {
    ticket: Ticket
    state: TicketState
    positions: Position[]
    messages: Message[]
    firstNewMessageNumber: number
}

function getLastSessionStart(
    { journal, task, position }: TaskTypeContext,
    tasks: Task[],
    positions: Position[],
): string | undefined {
    const earlierTaskIds = new Set(
        tasks
            .filter(
                (earlierTask) =>
                    earlierTask.id !== task.id &&
                    earlierTask.params.ticketNumber ===
                        task.params.ticketNumber &&
                    getTaskPositionId(earlierTask, positions) === position.id,
            )
            .map(({ id }) => id),
    )
    return journal.events
        .map((event) => getEventOfType(event, taskStartedEventType))
        .findLast(
            (startedEvent) =>
                startedEvent !== undefined &&
                earlierTaskIds.has(startedEvent.taskId),
        )?.occurredAt
}

export async function loadTicketSituation(
    ctx: TaskTypeContext,
    ticketNumber: number,
): Promise<TicketSituation> {
    const { projectRoot, journal } = ctx
    const [ticket, messages, tasks, positions] = await Promise.all([
        loadExistingTicket(projectRoot, ticketNumber),
        listMessages(projectRoot, ticketNumber),
        listTasks(projectRoot),
        listPositions(projectRoot),
    ])
    const state = getTicketStates([ticket], journal.events, positions).get(
        ticket.number,
    )
    if (state === undefined) {
        throw new Error(`Ticket #${ticket.number} got no state`)
    }
    const lastSessionStart = getLastSessionStart(ctx, tasks, positions)
    const firstNewMessageIndex =
        lastSessionStart === undefined
            ? 0
            : messages.findIndex(({ sentAt }) => sentAt >= lastSessionStart)
    const firstNewMessageNumber =
        (firstNewMessageIndex === -1 ? messages.length : firstNewMessageIndex) +
        1
    return { ticket, state, positions, messages, firstNewMessageNumber }
}
