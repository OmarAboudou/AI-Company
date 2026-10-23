import { readGitCommitter } from "../../git/read-git-committer.ts"
import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import type { Position } from "../../organization/position/schema.ts"
import { loadProject } from "../../organization/project/storage.ts"
import { readMonotonicTime } from "../../read-monotonic-time.ts"
import { type Task, taskStartedEventType } from "../task/schema.ts"
import type { TaskSession } from "../task-type/define-task-type.ts"
import { getToolDefinitions } from "../tool/get-tool-definitions.ts"
import { buildSystemPrompt } from "./build-system-prompt.ts"
import { getRunTools } from "./get-run-tools.ts"
import type { Run } from "./schema.ts"
import { startRun } from "./start-run.ts"

export type HumanRunStart = {
    task: Task
    position: Position
    session: Extract<TaskSession, { kind: "run" }>
}

export async function startHumanRun(
    journal: Journal,
    { task, position, session }: HumanRunStart,
): Promise<Run> {
    const { projectRoot } = journal
    const [company, project] = await Promise.all([
        loadCompany(projectRoot),
        loadProject(projectRoot),
    ])
    const runId = createTimeOrderedId(readMonotonicTime())
    const causeEvent = requireJournalEvent(journal, task.causeEventId)
    await recordEvent(journal, taskStartedEventType, {
        depth: causeEvent.depth,
        taskId: task.id,
        runId,
        worker: { kind: "directors" },
    })
    const { toolNames, boundToolInputs, result } = session
    const tools = getRunTools(toolNames, boundToolInputs)
    return startRun(projectRoot, {
        id: runId,
        systemPrompt: buildSystemPrompt({
            company,
            project,
            position,
            workerName: readGitCommitter(projectRoot).name,
        }),
        tools: getToolDefinitions(tools),
        userMessage: session.userMessage,
        session: { toolNames, boundToolInputs, result },
    })
}
