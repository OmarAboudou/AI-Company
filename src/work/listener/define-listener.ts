import type { EventOfType, EventType } from "../../journal/schema.ts"
import type { UncreatedTask } from "../task/schema.ts"

export type CreateTaskEffect = { kind: "create-task"; task: UncreatedTask }

export type ListenerEffect = CreateTaskEffect

export type Listener<Type extends EventType = EventType> = {
    eventType: Type
    getEffects(event: EventOfType<Type>): ListenerEffect[]
}

export function defineListener<Type extends EventType>(
    listener: Listener<Type>,
): Listener<Type> {
    return listener
}
