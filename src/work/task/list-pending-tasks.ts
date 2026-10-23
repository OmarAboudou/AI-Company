import type { Journal } from "../../journal/schema.ts"
import type { Employee } from "../../organization/employee/schema.ts"
import { listEmployees } from "../../organization/employee/storage.ts"
import { listPositionAssignments } from "../../organization/position/list-position-assignments.ts"
import type {
    Position,
    PositionAssignment,
} from "../../organization/position/schema.ts"
import { UserError } from "../../user-error.ts"
import { getCompanyPause } from "../pause/get-company-pause.ts"
import type { TaskType } from "../task-type/define-task-type.ts"
import { getTaskPositionId } from "./get-task-position-id.ts"
import { getTaskStates, type TaskState } from "./get-task-states.ts"
import { isPendingTask } from "./is-pending-task.ts"
import type { Task } from "./schema.ts"
import { listTasks } from "./storage.ts"

export type WaitingReason =
    | "unknown-type"
    | "deleted-position"
    | "vacant-position"
    | "worked-by-directors"
    | "running"
    | "paused"

export type PendingTask =
    | { kind: "ready"; task: Task; position: Position; employee: Employee }
    | { kind: "waiting"; task: Task; positionId: string; reason: WaitingReason }

function getPendingTask(
    task: Task,
    taskState: TaskState | undefined,
    isPaused: boolean,
    assignments: PositionAssignment[],
    employees: Employee[],
    taskTypes: Record<string, TaskType>,
): PendingTask {
    const positions = assignments.map(({ position }) => position)
    const positionId = getTaskPositionId(task, positions)
    const waitingTask = { kind: "waiting", task, positionId } as const
    if (taskTypes[task.type] === undefined) {
        return { ...waitingTask, reason: "unknown-type" }
    }
    const assignment = assignments.find(
        ({ position }) => position.id === positionId,
    )
    if (assignment === undefined) {
        return { ...waitingTask, reason: "deleted-position" }
    }
    const { position, currentWorker } = assignment
    if (currentWorker === undefined) {
        return { ...waitingTask, reason: "vacant-position" }
    }
    if (currentWorker.kind === "directors") {
        return { ...waitingTask, reason: "worked-by-directors" }
    }
    // A task serves once: a model's session cut short fails its task
    // rather than leaving it to another.
    if (taskState === "running") {
        return { ...waitingTask, reason: "running" }
    }
    if (isPaused) {
        return { ...waitingTask, reason: "paused" }
    }
    const employee = employees.find(({ id }) => id === currentWorker.employeeId)
    if (employee === undefined) {
        throw new UserError(
            `Position "${position.id}" names employee "${currentWorker.employeeId}", who doesn't exist. Run \`aico position show ${position.id}\`.`,
        )
    }
    return { kind: "ready", task, position, employee }
}

export async function listPendingTasks(
    journal: Journal,
    taskTypes: Record<string, TaskType>,
): Promise<PendingTask[]> {
    const { projectRoot } = journal
    const [tasks, assignments, employees] = await Promise.all([
        listTasks(projectRoot),
        listPositionAssignments(projectRoot),
        listEmployees(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, journal.events)
    const isPaused = getCompanyPause(journal.events) !== undefined
    return tasks
        .filter((task) => isPendingTask(task, taskStates))
        .map((task) =>
            getPendingTask(
                task,
                taskStates.get(task.id),
                isPaused,
                assignments,
                employees,
                taskTypes,
            ),
        )
}
