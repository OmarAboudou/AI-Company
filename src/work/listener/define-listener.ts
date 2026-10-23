import type { IdHistory } from "../../ids/id-history-schema.ts"
import type {
    EventOfType,
    EventType,
    JournalEvent,
} from "../../journal/schema.ts"
import type { TicketState } from "../../messaging/ticket/get-ticket-states.ts"
import type { TaskState } from "../task/get-task-states.ts"
import type { Task, UncreatedTask } from "../task/schema.ts"

export type CreateTaskEffect = { kind: "create-task"; task: UncreatedTask }

export type CancelTaskEffect = {
    kind: "cancel-task"
    taskId: string
    reason: string
}

export type ListenerEffect = CreateTaskEffect | CancelTaskEffect

export type ListenerContext = {
    events: readonly JournalEvent[]
    directorPositionId: string
    tasks: readonly Task[]
    taskStates: ReadonlyMap<string, TaskState>
    positions: readonly IdHistory[]
    ticketStates: ReadonlyMap<number, TicketState>
}

export type Listener<Type extends EventType = EventType> = {
    eventType: Type
    getEffects(event: EventOfType<Type>, ctx: ListenerContext): ListenerEffect[]
}

export function defineListener<Type extends EventType>(
    listener: Listener<Type>,
): Listener<Type> {
    return listener
}
