import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { loadAnthropicMessagesModel } from "../../llm/anthropic-messages/load-anthropic-messages-model.ts"
import type { TokenUsage } from "../../llm/conversation/schema.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import type { LlmEmployee } from "../../organization/employee/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import { readMonotonicTime } from "../../read-monotonic-time.ts"
import { type Task, taskStartedEventType } from "../task/schema.ts"
import type { TaskEnding } from "../tool/define-tool.ts"
import { getToolDefinitions } from "../tool/get-tool-definitions.ts"
import { beginTask } from "./begin-task.ts"
import { buildSystemPrompt } from "./build-system-prompt.ts"
import { endTask } from "./end-task.ts"
import { getRunTools } from "./get-run-tools.ts"
import { runToolLoop } from "./run-tool-loop.ts"
import type { RunProgress } from "./schema.ts"
import { startRun } from "./start-run.ts"

export type RunTaskResult = {
    taskEnding: TaskEnding
    run?: { runId: string; usage: TokenUsage }
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
    const beginning = await beginTask(journal, { task, position })
    if (beginning.kind === "done") {
        return { taskEnding: { state: "done", summary: beginning.summary } }
    }
    const { taskDepth, session } = beginning
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
    const { toolNames, boundToolInputs, result: sessionResult } = session
    const tools = getRunTools(toolNames, boundToolInputs)
    const run = await startRun(projectRoot, {
        id: runId,
        apiId: model.apiId,
        systemPrompt: buildSystemPrompt({
            company,
            position,
            workerName: employee.name,
        }),
        tools: getToolDefinitions(tools),
        userMessage: session.userMessage,
        session: { toolNames, boundToolInputs, result: sessionResult },
    })
    const { taskEnding, usage } = await runToolLoop({
        run,
        ctx: {
            projectRoot,
            journal,
            task,
            depth: taskDepth,
            position,
            worker: { kind: "employee", employee },
            runId,
        },
        connection,
        apiKey,
        apiId: model.apiId,
        tools,
        onProgress,
    })
    await endTask(
        journal,
        { task, position, runId, sessionResult, usage },
        taskEnding,
    )
    return { taskEnding, run: { runId, usage } }
}
