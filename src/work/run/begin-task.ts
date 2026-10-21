import { z } from "zod"
import { recordEvent } from "../../journal/record-event.ts"
import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import type { Journal } from "../../journal/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import { UserError } from "../../user-error.ts"
import { type Task, taskDoneEventType } from "../task/schema.ts"
import { builtInTaskTypes } from "../task-type/built-in/built-in.ts"
import type {
    TaskSession,
    TaskType,
    TaskTypeContext,
} from "../task-type/define-task-type.ts"

export type BeginTaskResult =
    | { kind: "done"; summary: string }
    | {
          kind: "run"
          taskType: TaskType
          params: unknown
          ctx: TaskTypeContext
          taskDepth: number
          session: Extract<TaskSession, { kind: "run" }>
      }

function requireTaskType(task: Task): TaskType {
    const taskType = builtInTaskTypes[task.type]
    if (taskType === undefined) {
        throw new UserError(
            `Task "${task.id}" is of type "${task.type}", which this version of llmco doesn't know: a newer one created it. Update llmco.`,
        )
    }
    return taskType
}

function parseTaskParams(task: Task, taskType: TaskType): unknown {
    const validation = taskType.paramsSchema.safeParse(task.params)
    if (!validation.success) {
        throw new UserError(
            `Invalid .llmco/tasks/${task.id}.json:\n${z.prettifyError(validation.error)}`,
        )
    }
    return validation.data
}

export async function beginTask(
    journal: Journal,
    { task, position }: { task: Task; position: Position },
): Promise<BeginTaskResult> {
    const taskType = requireTaskType(task)
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
    return { kind: "run", taskType, params, ctx, taskDepth, session }
}
