import { recordEvent } from "../../journal/record-event.ts"
import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import type { Journal } from "../../journal/schema.ts"
import type { TokenUsage } from "../../llm/conversation/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import {
    type Task,
    type TaskResult,
    taskCancelledEventType,
    taskDoneEventType,
    taskFailedEventType,
} from "../task/schema.ts"
import type { TaskType } from "../task-type/define-task-type.ts"
import { parseTaskParams } from "../task-type/parse-task-params.ts"
import { requireTaskType } from "../task-type/require-task-type.ts"
import type { TaskEnding } from "../tool/define-tool.ts"

export type TaskRunEnd = {
    task: Task
    position: Position
    runId: string
    depth: number
    sessionResult: TaskResult
    usage?: TokenUsage
    taskTypes: Record<string, TaskType>
}

export async function endTask(
    journal: Journal,
    {
        task,
        position,
        runId,
        depth,
        sessionResult,
        usage,
        taskTypes,
    }: TaskRunEnd,
    taskEnding: TaskEnding,
): Promise<void> {
    const causeEvent = requireJournalEvent(journal, task.causeEventId)
    const runEnd = {
        depth,
        taskId: task.id,
        runId,
        ...(usage !== undefined && { usage }),
    }
    if (taskEnding.state === "failed") {
        await recordEvent(journal, taskFailedEventType, {
            ...runEnd,
            reason: taskEnding.reason,
        })
        return
    }
    if (taskEnding.state === "cancelled") {
        await recordEvent(journal, taskCancelledEventType, {
            ...runEnd,
            reason: taskEnding.reason,
        })
        return
    }
    const taskType = requireTaskType(task, taskTypes)
    const params = parseTaskParams(task, taskType)
    const { projectRoot } = journal
    const ctx = { projectRoot, journal, task, position, causeEvent }
    const result =
        taskType.getRunResult === undefined
            ? sessionResult
            : await taskType.getRunResult(params, { runId, sessionResult }, ctx)
    await recordEvent(journal, taskDoneEventType, {
        ...runEnd,
        hasPassedHand: taskEnding.hasPassedHand,
        ...(taskEnding.summary !== undefined && {
            summary: taskEnding.summary,
        }),
        result: taskType.resultSchema.parse(result),
    })
}
