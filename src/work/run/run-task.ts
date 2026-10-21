import { z } from "zod"
import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { loadEvent } from "../../journal/storage.ts"
import { loadAnthropicMessagesModel } from "../../llm/anthropic-messages/load-anthropic-messages-model.ts"
import type { TokenUsage } from "../../llm/conversation/schema.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import type { LlmEmployee } from "../../organization/employee/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import { readMonotonicTime } from "../../read-monotonic-time.ts"
import { UserError } from "../../user-error.ts"
import {
    type Task,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "../task/schema.ts"
import { builtInTaskTypes } from "../task-type/built-in/built-in.ts"
import type {
    BoundToolInputs,
    TaskType,
} from "../task-type/define-task-type.ts"
import { bindTool } from "../tool/bind-tool.ts"
import {
    type BuiltInToolName,
    builtInTools,
} from "../tool/built-in/built-in.ts"
import type { TaskEnding, Tool } from "../tool/define-tool.ts"
import { buildSystemPrompt } from "./build-system-prompt.ts"
import { runToolLoop } from "./run-tool-loop.ts"
import type { RunProgress } from "./schema.ts"

export type RunTaskResult = {
    taskEnding: TaskEnding
    run?: { runId: string; usage: TokenUsage }
}

// Every run can end its task, whichever tools its type gives.
const taskEndingToolNames: BuiltInToolName[] = [
    "task_mark-as-done",
    "task_mark-as-failed",
]

function getRunTools(
    toolNames: BuiltInToolName[],
    boundToolInputs: BoundToolInputs = {},
): Record<string, Tool> {
    return Object.fromEntries(
        [...toolNames, ...taskEndingToolNames].map((name) => {
            const tool: Tool = builtInTools[name]
            return [name, bindTool(tool, boundToolInputs[name] ?? {})]
        }),
    )
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

export async function runTask(
    journal: Journal,
    environment: NodeJS.ProcessEnv,
    {
        task,
        position,
        employee,
        onProgress,
    }: {
        task: Task
        position: Position
        employee: LlmEmployee
        onProgress: (progress: RunProgress) => void
    },
): Promise<RunTaskResult> {
    const { projectRoot } = journal
    const taskType = requireTaskType(task)
    const params = parseTaskParams(task, taskType)
    const causeEvent = await loadEvent(projectRoot, task.causeEventId)
    const taskDepth = causeEvent.depth + 1
    const ctx = { projectRoot, task, position, causeEvent }
    const session = await taskType.createSession(params, ctx)
    if (session.kind === "done") {
        const { summary } = session
        await recordEvent(journal, taskDoneEventType, {
            depth: taskDepth,
            taskId: task.id,
            summary,
            result: taskType.resultSchema.parse(session.result),
        })
        return { taskEnding: { state: "done", summary } }
    }
    const [{ provider, model, connection, apiKey }, company] =
        await Promise.all([
            loadAnthropicMessagesModel(projectRoot, environment, employee),
            loadCompany(projectRoot),
        ])
    const runId = createTimeOrderedId(readMonotonicTime())
    await recordEvent(journal, taskStartedEventType, {
        depth: taskDepth,
        taskId: task.id,
        runId,
        employeeId: employee.id,
        model: { providerId: provider.id, modelId: model.id },
    })
    const { taskEnding, usage } = await runToolLoop({
        ctx: {
            projectRoot,
            journal,
            task,
            taskDepth,
            position,
            employee,
            runId,
        },
        connection,
        apiKey,
        apiId: model.apiId,
        systemPrompt: buildSystemPrompt({ company, position, employee }),
        userMessage: session.userMessage,
        tools: getRunTools(session.toolNames, session.boundToolInputs),
        onProgress,
    })
    const runEnd = { depth: taskDepth, taskId: task.id, runId, usage }
    if (taskEnding.state === "done") {
        const sessionResult = session.result
        const result =
            taskType.getRunResult === undefined
                ? sessionResult
                : await taskType.getRunResult(
                      params,
                      { runId, sessionResult },
                      ctx,
                  )
        await recordEvent(journal, taskDoneEventType, {
            ...runEnd,
            summary: taskEnding.summary,
            result: taskType.resultSchema.parse(result),
        })
    } else {
        await recordEvent(journal, taskFailedEventType, {
            ...runEnd,
            reason: taskEnding.reason,
        })
    }
    return { taskEnding, run: { runId, usage } }
}
