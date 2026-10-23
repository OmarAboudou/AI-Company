import { recordEvent } from "../../journal/record-event.ts"
import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import type { Journal } from "../../journal/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import { type Task, taskDoneEventType } from "../task/schema.ts"
import type { TaskSession, TaskType } from "../task-type/define-task-type.ts"
import { parseTaskParams } from "../task-type/parse-task-params.ts"
import { requireTaskType } from "../task-type/require-task-type.ts"

export type BeginTaskResult =
    | { kind: "done"; summary: string }
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
    const { projectRoot } = journal
    const ctx = { projectRoot, journal, task, position, causeEvent }
    const session = await taskType.createSession(params, ctx)
    if (session.kind === "done") {
        const { summary } = session
        await recordEvent(journal, taskDoneEventType, {
            depth: taskDepth,
            taskId: task.id,
            summary,
            result: taskType.resultSchema.parse(session.result),
        })
        return { kind: "done", summary }
    }
    return { kind: "run", taskDepth, session }
}
