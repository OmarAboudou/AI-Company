import {
    deliveryValidatedEventType,
    ticketCancelledEventType,
    ticketFailedEventType,
} from "../../../messaging/ticket/act/schema.ts"
import {
    defineListener,
    type Listener,
    type ListenerEffect,
} from "../define-listener.ts"

export const ticketClosingListeners: Listener[] = [
    deliveryValidatedEventType,
    ticketCancelledEventType,
    ticketFailedEventType,
].map((eventType) =>
    defineListener({
        eventType,
        getEffects: ({ ticketNumber }, { tasks, taskStates, ticketStates }) => {
            const outcome = ticketStates.get(ticketNumber)?.outcome
            return tasks
                .filter(
                    (task) =>
                        task.params.ticketNumber === ticketNumber &&
                        taskStates.get(task.id) === "queued",
                )
                .map(
                    (task): ListenerEffect => ({
                        kind: "cancel-task",
                        taskId: task.id,
                        reason: `Ticket #${ticketNumber} was closed, ${outcome}.`,
                    }),
                )
        },
    }),
)
