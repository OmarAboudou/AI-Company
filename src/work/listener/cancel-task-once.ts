import { recordEvent } from "../../journal/record-event.ts"
import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import { taskCancelledEventType } from "../task/schema.ts"
import type { CancelTaskEffect } from "./define-listener.ts"
import type { Dispatching } from "./load-dispatching.ts"

// A running task is left to its run, which stops at its next step: the
// run alone ends what it runs.
export async function cancelTaskOnce(
    { taskId, reason }: CancelTaskEffect,
    dispatching: Dispatching,
): Promise<void> {
    const { journal, tasks, taskStates } = dispatching
    const task = tasks.find(({ id }) => id === taskId)
    if (task === undefined || taskStates.get(taskId) !== "queued") {
        return
    }
    const causeEvent = requireJournalEvent(journal, task.causeEventId)
    await recordEvent(journal, taskCancelledEventType, {
        depth: causeEvent.depth + 1,
        taskId,
        reason,
    })
    taskStates.set(taskId, "cancelled")
    dispatching.cancelledTasks.push(task)
}
