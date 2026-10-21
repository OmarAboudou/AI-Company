import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { EventOfType, EventType } from "../../journal/schema.ts"
import type { TaskState } from "../task/get-task-states.ts"
import type { Task, TaskResult, UncreatedTask } from "../task/schema.ts"

export type CreateTaskEffect = { kind: "create-task"; task: UncreatedTask }

export type MarkTaskAsDoneEffect = {
    kind: "mark-task-as-done"
    taskId: string
    summary: string
    result: TaskResult
}

export type ListenerEffect = CreateTaskEffect | MarkTaskAsDoneEffect

export type ListenerContext = {
    tasks: readonly Task[]
    taskStates: ReadonlyMap<string, TaskState>
    positions: readonly IdHistory[]
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
