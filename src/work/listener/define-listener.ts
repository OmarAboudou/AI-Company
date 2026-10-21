import type { EventOfType, EventType } from "../../journal/schema.ts"
import type { UncreatedTask } from "../task/schema.ts"

export type Listener<Type extends EventType = EventType> = {
    eventType: Type
    getTasksToCreate(event: EventOfType<Type>): UncreatedTask[]
}

export function defineListener<Type extends EventType>(
    listener: Listener<Type>,
): Listener<Type> {
    return listener
}
