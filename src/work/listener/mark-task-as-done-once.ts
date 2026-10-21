import { recordEvent } from "../../journal/record-event.ts"
import { loadEvent } from "../../journal/storage.ts"
import { isPendingTask } from "../task/is-pending-task.ts"
import { taskDoneEventType } from "../task/schema.ts"
import { builtInTaskTypes } from "../task-type/built-in/built-in.ts"
import type { MarkTaskAsDoneEffect } from "./define-listener.ts"
import type { Dispatching } from "./load-dispatching.ts"

export async function markTaskAsDoneOnce(
    { taskId, summary, result }: MarkTaskAsDoneEffect,
    dispatching: Dispatching,
): Promise<void> {
    const { journal, tasks, taskStates } = dispatching
    const task = tasks.find(({ id }) => id === taskId)
    if (task === undefined || !isPendingTask(task, taskStates)) {
        return
    }
    const taskType = builtInTaskTypes[task.type]
    if (taskType === undefined) {
        throw new Error(
            `A listener marked task "${task.id}" as done, of type "${task.type}", which llmco doesn't know.`,
        )
    }
    const causeEvent = await loadEvent(journal.projectRoot, task.causeEventId)
    await recordEvent(journal, taskDoneEventType, {
        depth: causeEvent.depth + 1,
        taskId,
        summary,
        result: taskType.resultSchema.parse(result),
    })
    taskStates.set(taskId, "done")
    dispatching.doneTasks.push(task)
}
