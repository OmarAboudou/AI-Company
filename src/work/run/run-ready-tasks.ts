import { requireCompany } from "../../organization/company/require-company.ts"
import type { LlmEmployee } from "../../organization/employee/schema.ts"
import type { Position } from "../../organization/position/schema.ts"
import { UserError } from "../../user-error.ts"
import { builtInListeners } from "../listener/built-in-listeners.ts"
import { dispatchEvents } from "../listener/dispatch-events.ts"
import {
    listPendingTasks,
    type PendingTask,
} from "../task/list-pending-tasks.ts"
import type { ChainStoppedEvent, Task } from "../task/schema.ts"
import { type RunTaskResult, runTask } from "./run-task.ts"
import type { RunProgress } from "./run-tool-loop.ts"

export type WaitingTask = Extract<PendingTask, { kind: "waiting" }>

export type RunReadyTasksProgress =
    | RunProgress
    | { kind: "chain-stopped"; chainStoppedEvent: ChainStoppedEvent }
    | {
          kind: "task-started"
          task: Task
          position: Position
          employee: LlmEmployee
      }
    | { kind: "task-ended"; task: Task; result: RunTaskResult }

export type RunReadyTasksResult = { waitingTasks: WaitingTask[] }

export async function runReadyTasks(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    onProgress: (progress: RunReadyTasksProgress) => void,
): Promise<RunReadyTasksResult> {
    await requireCompany(projectRoot)
    while (true) {
        const { chainStoppedEvents } = await dispatchEvents(
            projectRoot,
            builtInListeners,
        )
        for (const chainStoppedEvent of chainStoppedEvents) {
            onProgress({ kind: "chain-stopped", chainStoppedEvent })
        }
        const pendingTasks = await listPendingTasks(projectRoot)
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
            const result = await runTask(projectRoot, environment, {
                task,
                position,
                employee,
                onProgress,
            })
            onProgress({ kind: "task-ended", task, result })
        } catch (error) {
            if (!(error instanceof UserError)) {
                throw error
            }
            throw new UserError(
                `${error.message}\nTask "${task.id}" stays pending: run \`llmco run\` again to take it up.`,
            )
        }
    }
}
