import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import { loadJournal } from "../../journal/storage.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { defaultMaxTaskDepth } from "../../organization/company/schema.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import { getPositionsWorkedBy } from "../../organization/human/get-positions-worked-by.ts"
import { readCurrentHuman } from "../../organization/human/read-current-human.ts"
import { readCurrentPositionId } from "../../organization/human/read-current-position-id.ts"
import { requirePositionsToWork } from "../../organization/human/require-positions-to-work.ts"
import { listPositionAssignments } from "../../organization/position/list-position-assignments.ts"
import type { Position } from "../../organization/position/schema.ts"
import { builtInListeners } from "../listener/built-in-listeners.ts"
import { dispatchEvents } from "../listener/dispatch-events.ts"
import { beginTask } from "../run/begin-task.ts"
import { loadResumableRun } from "../run/load-resumable-run.ts"
import type { Run } from "../run/schema.ts"
import { startHumanRun } from "../run/start-human-run.ts"
import { builtInTaskTypes } from "../task-type/built-in/built-in.ts"
import type { StagedTurn } from "../turn/schema.ts"
import { loadStagedTurn } from "../turn/storage.ts"
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
    taskDepth: number
    maxTaskDepth: number
    isResumed: boolean
}

export type OpenNextTaskResult = {
    openedTask: OpenedTask | undefined
    doneTasks: { task: Task; summary: string }[]
}

export async function openNextTask(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
): Promise<OpenNextTaskResult> {
    await requireCompany(projectRoot)
    const [human, assignments, company, journal] = await Promise.all([
        readCurrentHuman(projectRoot, environment),
        listPositionAssignments(projectRoot),
        loadCompany(projectRoot),
        loadJournal(projectRoot),
    ])
    const positionsToWork = requirePositionsToWork(
        human,
        getPositionsWorkedBy(assignments, human).map(
            ({ position }) => position,
        ),
        readCurrentPositionId(environment),
    )
    await dispatchEvents(journal, builtInListeners)
    const tasks = await listTasks(projectRoot)
    const taskStates = getTaskStates(tasks, journal.events)
    const positions = assignments.map(({ position }) => position)
    const tasksToWork = tasks
        .filter(
            (task) =>
                isPendingTask(task, taskStates) &&
                builtInTaskTypes[task.type] !== undefined,
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
    const maxTaskDepth = company.maxTaskDepth ?? defaultMaxTaskDepth
    const doneTasks: OpenNextTaskResult["doneTasks"] = []
    for (const { task, position } of tasksToWork) {
        if (position === undefined) {
            continue
        }
        const resumableRun = await loadResumableRun(journal, task, human)
        if (resumableRun !== undefined) {
            const causeEvent = requireJournalEvent(journal, task.causeEventId)
            const openedTask = {
                task,
                position,
                run: resumableRun,
                stagedTurn: await loadStagedTurn(projectRoot, resumableRun.id),
                taskDepth: causeEvent.depth + 1,
                maxTaskDepth,
                isResumed: true,
            }
            return { openedTask, doneTasks }
        }
        const beginning = await beginTask(journal, { task, position })
        if (beginning.kind === "done") {
            doneTasks.push({ task, summary: beginning.summary })
            continue
        }
        const { taskDepth, session } = beginning
        const run = await startHumanRun(journal, {
            task,
            position,
            human,
            session,
        })
        const openedTask = {
            task,
            position,
            run,
            stagedTurn: { blocks: [] },
            taskDepth,
            maxTaskDepth,
            isResumed: false,
        }
        return { openedTask, doneTasks }
    }
    return { openedTask: undefined, doneTasks }
}
