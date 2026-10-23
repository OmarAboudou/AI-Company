import { runOperation } from "../../git/reserved-branch/run-operation.ts"
import { loadJournal, refreshJournal } from "../../journal/storage.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import type { Employee } from "../../organization/employee/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import { UserError } from "../../user-error.ts"
import { dispatchEvents } from "../listener/dispatch-events.ts"
import {
    listPendingTasks,
    type PendingTask,
} from "../task/list-pending-tasks.ts"
import type { Task } from "../task/schema.ts"
import { builtInWorkCatalog, type WorkCatalog } from "../work-catalog.ts"
import { failCutShortTasks } from "./fail-cut-short-tasks.ts"
import { type RunTaskResult, runTask } from "./run-task.ts"
import type { RunProgress } from "./schema.ts"

export type WaitingTask = Extract<PendingTask, { kind: "waiting" }>

export type RunReadyTasksProgress =
    | RunProgress
    | {
          kind: "task-started"
          task: Task
          position: Position
          employee: Employee
      }
    | { kind: "task-ended"; task: Task; result: RunTaskResult }
    | { kind: "task-cut-short"; task: Task }

export type ReadyTasksRunning = {
    catalog?: WorkCatalog
    signal?: AbortSignal
}

export type RunReadyTasksResult =
    | { kind: "none-ready"; waitingTasks: WaitingTask[] }
    | { kind: "stopped" }

function formatFailureStop(failedTask: Task): string {
    return `aico run stops at the failure of task "${failedTask.id}", so that the next tasks don't fail for the same reason. Once its cause is fixed, run \`aico run\` again for them: a failed task doesn't run again.`
}

export async function runReadyTasks(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    operationName: string,
    onProgress: (progress: RunReadyTasksProgress) => void,
    { catalog = builtInWorkCatalog, signal }: ReadyTasksRunning = {},
): Promise<RunReadyTasksResult> {
    await requireCompany(projectRoot)
    const journal = await loadJournal(projectRoot)
    const cutShortTasks = await runOperation(projectRoot, operationName, () =>
        failCutShortTasks(journal),
    )
    for (const task of cutShortTasks) {
        onProgress({ kind: "task-cut-short", task })
    }
    const [firstCutShortTask] = cutShortTasks
    if (firstCutShortTask !== undefined) {
        throw new UserError(formatFailureStop(firstCutShortTask))
    }
    while (true) {
        await runOperation(projectRoot, operationName, async () => {
            // Another process, a person's terminal for one, may have
            // written events since the last turn.
            await refreshJournal(journal)
            await dispatchEvents(journal, catalog)
        })
        if (signal?.aborted) {
            return { kind: "stopped" }
        }
        const pendingTasks = await listPendingTasks(journal, catalog.taskTypes)
        const readyTask = pendingTasks.find(
            (pendingTask) => pendingTask.kind === "ready",
        )
        if (readyTask === undefined) {
            const waitingTasks = pendingTasks.filter(
                (pendingTask) => pendingTask.kind === "waiting",
            )
            return { kind: "none-ready", waitingTasks }
        }
        const { task, position, employee } = readyTask
        onProgress({ kind: "task-started", task, position, employee })
        let result: RunTaskResult
        try {
            result = await runTask(journal, environment, {
                task,
                position,
                employee,
                taskTypes: catalog.taskTypes,
                operationName,
                onProgress,
                signal,
            })
        } catch (error) {
            if (!(error instanceof UserError)) {
                throw error
            }
            throw new UserError(
                `${error.message}\nTask "${task.id}" stays pending: run \`aico run\` again to take it up.`,
            )
        }
        onProgress({ kind: "task-ended", task, result })
        if (signal?.aborted) {
            return { kind: "stopped" }
        }
        if (result.taskEnding.state === "failed") {
            throw new UserError(formatFailureStop(task))
        }
    }
}
