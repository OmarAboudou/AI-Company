import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { loadEvent } from "../../journal/storage.ts"
import { loadAnthropicMessagesModel } from "../../llm/anthropic-messages/load-anthropic-messages-model.ts"
import type { LlmEmployee } from "../../organization/employee/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import { readMonotonicTime } from "../../read-monotonic-time.ts"
import {
    type Task,
    taskCompletedEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "../task/schema.ts"
import type { TaskEnding, Tool } from "../tool/define-tool.ts"
import { type RunProgress, runToolLoop } from "./run-tool-loop.ts"
import type { TokenUsage } from "./schema.ts"

export type RunTaskResult = {
    runId: string
    taskEnding: TaskEnding
    usage: TokenUsage
}

export async function runTask(
    projectRoot: string,
    {
        task,
        position,
        employee,
        systemPrompt,
        userMessage,
        tools,
        onProgress,
    }: {
        task: Task
        position: Position
        employee: LlmEmployee
        systemPrompt: string
        userMessage: string
        tools: Record<string, Tool>
        onProgress: (progress: RunProgress) => void
    },
): Promise<RunTaskResult> {
    const [{ provider, model, connection, apiKey }, causeEvent] =
        await Promise.all([
            loadAnthropicMessagesModel(projectRoot, employee),
            loadEvent(projectRoot, task.causeEventId),
        ])
    const taskDepth = causeEvent.depth + 1
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
        systemPrompt,
        userMessage,
        tools,
        onProgress,
    })
    const runEnd = { depth: taskDepth, taskId: task.id, runId, usage }
    if (taskEnding.state === "succeeded") {
        await recordEvent(projectRoot, taskCompletedEventType, {
            ...runEnd,
            summary: taskEnding.summary,
        })
    } else {
        await recordEvent(projectRoot, taskFailedEventType, {
            ...runEnd,
            reason: taskEnding.reason,
        })
    }
    return { runId, taskEnding, usage }
}
