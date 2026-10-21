import type { EventOfType, EventType } from "../../journal/schema.ts"
import type { UncreatedTask } from "../task/schema.ts"

export type ListenerEffect = { kind: "create-task"; task: UncreatedTask }

export type Listener<Type extends EventType = EventType> = {
    eventType: Type
    getEffects(event: EventOfType<Type>): ListenerEffect[]
}

export function defineListener<Type extends EventType>(
    listener: Listener<Type>,
): Listener<Type> {
    return listener
}
