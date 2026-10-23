import { recordEvent } from "../../journal/record-event.ts"
import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import { isPendingTask } from "../task/is-pending-task.ts"
import { taskDoneEventType } from "../task/schema.ts"
import type { MarkTaskAsDoneEffect } from "./define-listener.ts"
import type { Dispatching } from "./load-dispatching.ts"

export async function markTaskAsDoneOnce(
    { taskId, summary, result }: MarkTaskAsDoneEffect,
    dispatching: Dispatching,
): Promise<void> {
    const { journal, taskTypes, tasks, taskStates } = dispatching
    const task = tasks.find(({ id }) => id === taskId)
    if (task === undefined || !isPendingTask(task, taskStates)) {
        return
    }
    const taskType = taskTypes[task.type]
    if (taskType === undefined) {
        throw new Error(
            `A listener marked task "${task.id}" as done, of type "${task.type}", which AICo doesn't know.`,
        )
    }
    const causeEvent = requireJournalEvent(journal, task.causeEventId)
    await recordEvent(journal, taskDoneEventType, {
        depth: causeEvent.depth + 1,
        taskId,
        summary,
        result: taskType.resultSchema.parse(result),
    })
    taskStates.set(taskId, "done")
    dispatching.doneTasks.push(task)
}
