import type { JournalEvent } from "../../journal/schema.ts"
import { createTaskOnce } from "./create-task-once.ts"
import type { ListenerEffect } from "./define-listener.ts"
import type { Dispatching } from "./load-dispatching.ts"
import { markTaskAsDoneOnce } from "./mark-task-as-done-once.ts"

export async function applyListenerEffect(
    effect: ListenerEffect,
    causeEvent: JournalEvent,
    dispatching: Dispatching,
): Promise<void> {
    switch (effect.kind) {
        case "create-task":
            return createTaskOnce(effect.task, causeEvent, dispatching)
        case "mark-task-as-done":
            return markTaskAsDoneOnce(effect, dispatching)
    }
}
