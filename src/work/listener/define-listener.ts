import type { EventOfType, EventType } from "../../journal/schema.ts"
import type { Task } from "../task/schema.ts"

export type NewTask = Pick<Task, "type" | "positionId" | "params">

export type Listener<Type extends EventType = EventType> = {
    eventType: Type
    getNewTasks(event: EventOfType<Type>): NewTask[]
}

export function defineListener<Type extends EventType>(
    listener: Listener<Type>,
): Listener<Type> {
    return listener
}
