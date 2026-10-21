import type { JournalEvent } from "../../journal/schema.ts"
import type { Task } from "../task/schema.ts"

export type NewTask = Pick<Task, "type" | "positionId" | "params">

type EventHandlers = {
    [Type in JournalEvent["type"]]?: (
        event: Extract<JournalEvent, { type: Type }>,
    ) => NewTask[]
}

export type Listener = { on: EventHandlers }

export function defineListener(listener: Listener): Listener {
    return listener
}
