import { z } from "zod"
import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents, loadEvent } from "../../journal/storage.ts"
import { loadAnthropicMessagesModel } from "../../llm/anthropic-messages/load-anthropic-messages-model.ts"
import type { TokenUsage } from "../../llm/conversation/schema.ts"
import { listMessages } from "../../messaging/message/storage.ts"
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
import { getLastEntryIdReadByRun } from "../task-type/built-in/catch-up-thread/get-last-entry-id-read-by-run.ts"
import type { TaskType } from "../task-type/define-task-type.ts"
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

function getRunTools(toolNames: BuiltInToolName[]): Record<string, Tool> {
    return Object.fromEntries(
        [...toolNames, ...taskEndingToolNames].map((name) => [
            name,
            builtInTools[name],
        ]),
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

async function loadLastReadEntryId(
    projectRoot: string,
    runId: string,
    { threadId, entryId }: { threadId: string; entryId: string },
): Promise<string> {
    const [threadMessages, events] = await Promise.all([
        listMessages(projectRoot, threadId),
        listEvents(projectRoot),
    ])
    return getLastEntryIdReadByRun(threadMessages, events, {
        runId,
        lastShownEntryId: entryId,
    })
}

export async function runTask(
    projectRoot: string,
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
    const taskType = requireTaskType(task)
    const params = parseTaskParams(task, taskType)
    const causeEvent = await loadEvent(projectRoot, task.causeEventId)
    const taskDepth = causeEvent.depth + 1
    const session = await taskType.createSession(params, {
        projectRoot,
        task,
        position,
        causeEvent,
    })
    if (session.kind === "done") {
        const { summary } = session
        await recordEvent(projectRoot, taskDoneEventType, {
            depth: taskDepth,
            taskId: task.id,
            summary,
        })
        return { taskEnding: { state: "done", summary } }
    }
    const [{ provider, model, connection, apiKey }, company] =
        await Promise.all([
            loadAnthropicMessagesModel(projectRoot, environment, employee),
            loadCompany(projectRoot),
        ])
    const runId = createTimeOrderedId(readMonotonicTime())
    await recordEvent(projectRoot, taskStartedEventType, {
        depth: taskDepth,
        taskId: task.id,
        runId,
        employeeId: employee.id,
        model: { providerId: provider.id, modelId: model.id },
    })
    const { taskEnding, usage } = await runToolLoop({
        ctx: { projectRoot, task, taskDepth, position, employee, runId },
        connection,
        apiKey,
        apiId: model.apiId,
        systemPrompt: buildSystemPrompt({ company, position, employee }),
        userMessage: session.userMessage,
        tools: getRunTools(session.toolNames),
        onProgress,
    })
    const runEnd = { depth: taskDepth, taskId: task.id, runId, usage }
    if (taskEnding.state === "done") {
        const { lastShownEntry } = session
        const lastReadEntryId =
            lastShownEntry &&
            (await loadLastReadEntryId(projectRoot, runId, lastShownEntry))
        await recordEvent(projectRoot, taskDoneEventType, {
            ...runEnd,
            summary: taskEnding.summary,
            ...(lastReadEntryId !== undefined && { lastReadEntryId }),
        })
    } else {
        await recordEvent(projectRoot, taskFailedEventType, {
            ...runEnd,
            reason: taskEnding.reason,
        })
    }
    return { taskEnding, run: { runId, usage } }
}
