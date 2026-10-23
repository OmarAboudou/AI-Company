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

export type RunReadyTasksResult = { waitingTasks: WaitingTask[] }

export async function runReadyTasks(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    operationName: string,
    onProgress: (progress: RunReadyTasksProgress) => void,
    catalog: WorkCatalog = builtInWorkCatalog,
): Promise<RunReadyTasksResult> {
    await requireCompany(projectRoot)
    const journal = await loadJournal(projectRoot)
    while (true) {
        await runOperation(projectRoot, operationName, async () => {
            // Another process, a person's terminal for one, may have
            // written events since the last turn.
            await refreshJournal(journal)
            await dispatchEvents(journal, catalog)
        })
        const pendingTasks = await listPendingTasks(journal, catalog.taskTypes)
        const readyTask = pendingTasks.find(
            (pendingTask) => pendingTask.kind === "ready",
        )
        if (readyTask === undefined) {
            const waitingTasks = pendingTasks.filter(
                (pendingTask) => pendingTask.kind === "waiting",
            )
            return { waitingTasks }
        }
        const { task, position, employee } = readyTask
        onProgress({ kind: "task-started", task, position, employee })
        try {
            const result = await runTask(journal, environment, {
                task,
                position,
                employee,
                taskTypes: catalog.taskTypes,
                operationName,
                onProgress,
            })
            onProgress({ kind: "task-ended", task, result })
        } catch (error) {
            if (!(error instanceof UserError)) {
                throw error
            }
            throw new UserError(
                `${error.message}\nTask "${task.id}" stays pending: run \`aico run\` again to take it up.`,
            )
        }
    }
}
