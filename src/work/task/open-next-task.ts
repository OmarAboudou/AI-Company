import { loadJournal } from "../../journal/storage.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { getPositionsWorkedByDirectors } from "../../organization/human/get-positions-worked-by-directors.ts"
import { readCurrentPositionId } from "../../organization/human/read-current-position-id.ts"
import { requirePositionsToWork } from "../../organization/human/require-positions-to-work.ts"
import { listPositionAssignments } from "../../organization/position/list-position-assignments.ts"
import type { Position } from "../../organization/position/schema.ts"
import { dispatchEvents } from "../listener/dispatch-events.ts"
import { beginTask } from "../run/begin-task.ts"
import { loadResumableRun } from "../run/load-resumable-run.ts"
import type { Run } from "../run/schema.ts"
import { startHumanRun } from "../run/start-human-run.ts"
import type { TaskEnding } from "../tool/define-tool.ts"
import type { StagedTurn } from "../turn/schema.ts"
import { loadStagedTurn } from "../turn/storage.ts"
import { builtInWorkCatalog, type WorkCatalog } from "../work-catalog.ts"
import { getTaskPositionId } from "./get-task-position-id.ts"
import { getTaskStates } from "./get-task-states.ts"
import { isPendingTask } from "./is-pending-task.ts"
import type { Task } from "./schema.ts"
import { listTasks } from "./storage.ts"

export type OpenedTask = {
    task: Task
    position: Position
    run: Run
    stagedTurn: StagedTurn
    isResumed: boolean
}

export type EndedTask = { task: Task; taskEnding: TaskEnding }

export type OpenNextTaskResult = {
    openedTask: OpenedTask | undefined
    endedTasks: EndedTask[]
}

export async function openNextTask(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    catalog: WorkCatalog = builtInWorkCatalog,
): Promise<OpenNextTaskResult> {
    await requireCompany(projectRoot)
    const [assignments, journal] = await Promise.all([
        listPositionAssignments(projectRoot),
        loadJournal(projectRoot),
    ])
    const positionsToWork = requirePositionsToWork(
        getPositionsWorkedByDirectors(assignments).map(
            ({ position }) => position,
        ),
        readCurrentPositionId(environment),
    )
    await dispatchEvents(journal, catalog)
    const tasks = await listTasks(projectRoot)
    const taskStates = getTaskStates(tasks, journal.events)
    const positions = assignments.map(({ position }) => position)
    const tasksToWork = tasks
        .filter(
            (task) =>
                isPendingTask(task, taskStates) &&
                catalog.taskTypes[task.type] !== undefined,
        )
        .map((task) => ({
            task,
            position: positionsToWork.find(
                ({ id }) => id === getTaskPositionId(task, positions),
            ),
        }))
        .sort(
            (first, second) =>
                Number(taskStates.get(second.task.id) === "running") -
                Number(taskStates.get(first.task.id) === "running"),
        )
    const endedTasks: EndedTask[] = []
    for (const { task, position } of tasksToWork) {
        if (position === undefined) {
            continue
        }
        const resumableRun = await loadResumableRun(journal, task)
        if (resumableRun !== undefined) {
            const openedTask = {
                task,
                position,
                run: resumableRun,
                stagedTurn: await loadStagedTurn(projectRoot, resumableRun.id),
                isResumed: true,
            }
            return { openedTask, endedTasks }
        }
        const beginning = await beginTask(journal, {
            task,
            position,
            taskTypes: catalog.taskTypes,
        })
        if (beginning.kind === "ended") {
            endedTasks.push({ task, taskEnding: beginning.taskEnding })
            continue
        }
        const { session } = beginning
        const run = await startHumanRun(journal, { task, position, session })
        const openedTask = {
            task,
            position,
            run,
            stagedTurn: { blocks: [] },
            isResumed: false,
        }
        return { openedTask, endedTasks }
    }
    return { openedTask: undefined, endedTasks }
}
