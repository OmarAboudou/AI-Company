import { listEvents } from "../../journal/storage.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import type { LlmEmployee } from "../../organization/employee/schema.ts"
import { loadEmployee } from "../../organization/employee/storage.ts"
import { getPositionAssignment } from "../../organization/position/get-position-assignment.ts"
import type { Position } from "../../organization/position/schema.ts"
import {
    listPositions,
    loadPositionState,
} from "../../organization/position/storage.ts"
import { builtInTaskTypes } from "../task-type/built-in/built-in.ts"
import { getTaskPositionId } from "./get-task-position-id.ts"
import { getTaskStates } from "./get-task-states.ts"
import { isPendingTask } from "./is-pending-task.ts"
import type { Task } from "./schema.ts"
import { listTasks } from "./storage.ts"

export type WaitingReason =
    | "unknown-type"
    | "deleted-position"
    | "vacant-position"
    | "worked-by-directors"
    | "worked-by-human"

export type PendingTask =
    | { kind: "ready"; task: Task; position: Position; employee: LlmEmployee }
    | { kind: "waiting"; task: Task; positionId: string; reason: WaitingReason }

async function loadPendingTask(
    projectRoot: string,
    task: Task,
    positions: Position[],
    directorPositionId: string,
): Promise<PendingTask> {
    const positionId = getTaskPositionId(task, positions)
    const waitingTask = { kind: "waiting", task, positionId } as const
    if (builtInTaskTypes[task.type] === undefined) {
        return { ...waitingTask, reason: "unknown-type" }
    }
    const position = positions.find(({ id }) => id === positionId)
    if (position === undefined) {
        return { ...waitingTask, reason: "deleted-position" }
    }
    const positionState = await loadPositionState(projectRoot, position.id)
    const worker = getPositionAssignment(
        position,
        positionState,
        directorPositionId,
    ).currentWorker
    if (worker === undefined) {
        return { ...waitingTask, reason: "vacant-position" }
    }
    if (worker.kind === "directors") {
        return { ...waitingTask, reason: "worked-by-directors" }
    }
    const employee = await loadEmployee(projectRoot, worker.employeeId)
    if (employee.kind === "human") {
        return { ...waitingTask, reason: "worked-by-human" }
    }
    return { kind: "ready", task, position, employee }
}

export async function listPendingTasks(
    projectRoot: string,
): Promise<PendingTask[]> {
    const [tasks, events, positions, company] = await Promise.all([
        listTasks(projectRoot),
        listEvents(projectRoot),
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, events)
    const { directorPositionId } = company
    return Promise.all(
        tasks
            .filter((task) => isPendingTask(task, taskStates))
            .map((task) =>
                loadPendingTask(
                    projectRoot,
                    task,
                    positions,
                    directorPositionId,
                ),
            ),
    )
}
