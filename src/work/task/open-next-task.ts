import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { loadJournal } from "../../journal/storage.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { getPositionsHeldByUser } from "../../organization/human/get-positions-held-by-user.ts"
import { readCurrentPositionId } from "../../organization/human/read-current-position-id.ts"
import { requirePositionsToWork } from "../../organization/human/require-positions-to-work.ts"
import { listPositionAssignments } from "../../organization/position/list-position-assignments.ts"
import type { Position } from "../../organization/position/schema.ts"
import { dispatchEvents } from "../listener/dispatch-events.ts"
import { getCompanyPause } from "../pause/get-company-pause.ts"
import { endTask } from "../run/end-task.ts"
import { loadCancellationReason } from "../run/load-cancellation-reason.ts"
import { loadResumableRun } from "../run/load-resumable-run.ts"
import type { Run } from "../run/schema.ts"
import { beginTask } from "../run/start/begin-task.ts"
import { startHumanRun } from "../run/start/start-human-run.ts"
import type { TaskType } from "../task-type/define-task-type.ts"
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

type ResumableTask = {
    task: Task
    position: Position
    run: Run
    taskTypes: Record<string, TaskType>
}

async function endPointlessRun(
    journal: Journal,
    { task, position, run, taskTypes }: ResumableTask,
): Promise<TaskEnding | undefined> {
    const cancellationReason = await loadCancellationReason(journal, {
        task,
        position,
        taskTypes,
    })
    if (cancellationReason === undefined) {
        return undefined
    }
    const taskEnding: TaskEnding = {
        state: "cancelled",
        reason: cancellationReason,
    }
    const { depth } = requireJournalEvent(journal, task.causeEventId)
    const sessionResult = run.session.result
    await endTask(
        journal,
        { task, position, runId: run.id, depth, sessionResult, taskTypes },
        taskEnding,
    )
    return taskEnding
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
        getPositionsHeldByUser(assignments).map(({ position }) => position),
        readCurrentPositionId(environment),
    )
    await dispatchEvents(journal, catalog)
    const tasks = await listTasks(projectRoot)
    const taskStates = getTaskStates(tasks, journal.events)
    const positions = assignments.map(({ position }) => position)
    const directorPositionId = assignments.find(
        ({ isDirectorPosition }) => isDirectorPosition,
    )?.position.id
    const isPaused = getCompanyPause(journal.events) !== undefined
    const canStart = (task: Task) =>
        !isPaused ||
        taskStates.get(task.id) === "running" ||
        getTaskPositionId(task, positions) === directorPositionId
    const tasksToWork = tasks
        .filter(
            (task) =>
                isPendingTask(task, taskStates) &&
                catalog.taskTypes[task.type] !== undefined &&
                canStart(task),
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
        const taskEnding =
            resumableRun &&
            (await endPointlessRun(journal, {
                task,
                position,
                run: resumableRun,
                taskTypes: catalog.taskTypes,
            }))
        if (taskEnding !== undefined) {
            endedTasks.push({ task, taskEnding })
            continue
        }
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
