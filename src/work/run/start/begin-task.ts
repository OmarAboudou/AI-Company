import { recordEvent } from "../../../journal/record-event.ts"
import { requireJournalEvent } from "../../../journal/require-journal-event.ts"
import type { Journal } from "../../../journal/schema.ts"
import type { Position } from "../../../organization/position/schema.ts"
import {
    type Task,
    taskCancelledEventType,
    taskDoneEventType,
} from "../../task/schema.ts"
import type { TaskSession, TaskType } from "../../task-type/define-task-type.ts"
import { parseTaskParams } from "../../task-type/parse-task-params.ts"
import { requireTaskType } from "../../task-type/require-task-type.ts"
import type { TaskEnding } from "../../tool/define-tool.ts"
import { loadCancellationReason } from "../load-cancellation-reason.ts"

export type BeginTaskResult =
    | { kind: "ended"; taskEnding: TaskEnding }
    | {
          kind: "run"
          taskDepth: number
          session: Extract<TaskSession, { kind: "run" }>
      }

export type TaskBeginning = {
    task: Task
    position: Position
    taskTypes: Record<string, TaskType>
}

export async function beginTask(
    journal: Journal,
    { task, position, taskTypes }: TaskBeginning,
): Promise<BeginTaskResult> {
    const taskType = requireTaskType(task, taskTypes)
    const params = parseTaskParams(task, taskType)
    const causeEvent = requireJournalEvent(journal, task.causeEventId)
    const taskDepth = causeEvent.depth + 1
    const cancellationReason = await loadCancellationReason(journal, {
        task,
        position,
        taskTypes,
    })
    if (cancellationReason !== undefined) {
        await recordEvent(journal, taskCancelledEventType, {
            depth: taskDepth,
            taskId: task.id,
            reason: cancellationReason,
        })
        const taskEnding: TaskEnding = {
            state: "cancelled",
            reason: cancellationReason,
        }
        return { kind: "ended", taskEnding }
    }
    const { projectRoot } = journal
    const ctx = { projectRoot, journal, task, position, causeEvent }
    const session = await taskType.createSession(params, ctx)
    if (session.kind === "done") {
        const { summary } = session
        await recordEvent(journal, taskDoneEventType, {
            depth: taskDepth,
            taskId: task.id,
            hasPassedHand: false,
            summary,
            result: taskType.resultSchema.parse(session.result),
        })
        const taskEnding: TaskEnding = {
            state: "done",
            hasPassedHand: false,
            summary,
        }
        return { kind: "ended", taskEnding }
    }
    return { kind: "run", taskDepth, session }
}
