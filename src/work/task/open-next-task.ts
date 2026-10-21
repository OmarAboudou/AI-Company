import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { requireJournalEvent } from "../../journal/require-journal-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { loadJournal } from "../../journal/storage.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { defaultMaxTaskDepth } from "../../organization/company/schema.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import { getPositionsWorkedBy } from "../../organization/human/get-positions-worked-by.ts"
import {
    type CurrentHuman,
    readCurrentHuman,
} from "../../organization/human/read-current-human.ts"
import { readCurrentPositionId } from "../../organization/human/read-current-position-id.ts"
import { requireSelectedPosition } from "../../organization/human/require-selected-position.ts"
import { listPositionAssignments } from "../../organization/position/list-position-assignments.ts"
import type { Position } from "../../organization/position/schema.ts"
import { UserError } from "../../user-error.ts"
import { builtInListeners } from "../listener/built-in-listeners.ts"
import { dispatchEvents } from "../listener/dispatch-events.ts"
import { beginTask } from "../run/begin-task.ts"
import type { Run } from "../run/schema.ts"
import { startHumanRun } from "../run/start-human-run.ts"
import { hasRun, loadRun } from "../run/storage.ts"
import { builtInTaskTypes } from "../task-type/built-in/built-in.ts"
import { getTaskPositionId } from "./get-task-position-id.ts"
import { getTaskStates } from "./get-task-states.ts"
import { isPendingTask } from "./is-pending-task.ts"
import { type Task, taskStartedEventType } from "./schema.ts"
import { listTasks } from "./storage.ts"

export type OpenedTask = {
    task: Task
    position: Position
    run: Run
    taskDepth: number
    maxTaskDepth: number
    isResumed: boolean
}

export type OpenNextTaskResult = {
    openedTask: OpenedTask | undefined
    doneTasks: { task: Task; summary: string }[]
}

function requirePositionsToWork(
    human: CurrentHuman,
    workedPositions: Position[],
    currentPositionId: string | undefined,
): Position[] {
    if (currentPositionId !== undefined) {
        return [requireSelectedPosition(workedPositions, currentPositionId)]
    }
    if (workedPositions.length === 0 && human.kind === "employee") {
        const { id, name } = human.employee
        throw new UserError(
            `${name} (${id}) works no position, so no task waits for them. A director can assign one temporarily: \`llmco position assign-temporarily employee <position-id> ${id}\`.`,
        )
    }
    return workedPositions
}

// A run this person started, on this machine, can go on; any other, such
// as an interrupted model's, is started afresh, as llmco run would.
async function loadResumableRun(
    journal: Journal,
    task: Task,
    human: CurrentHuman,
): Promise<Run | undefined> {
    const taskStartedEvent = journal.events
        .map((event) => getEventOfType(event, taskStartedEventType))
        .findLast((startedEvent) => startedEvent?.taskId === task.id)
    if (taskStartedEvent === undefined || taskStartedEvent.model) {
        return undefined
    }
    const employeeId = human.kind === "employee" ? human.employee.id : undefined
    if (taskStartedEvent.employeeId !== employeeId) {
        return undefined
    }
    const { projectRoot } = journal
    const { runId } = taskStartedEvent
    return (await hasRun(projectRoot, runId))
        ? loadRun(projectRoot, runId)
        : undefined
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
            taskDepth,
            session,
        })
        const openedTask = {
            task,
            position,
            run,
            taskDepth,
            maxTaskDepth,
            isResumed: false,
        }
        return { openedTask, doneTasks }
    }
    return { openedTask: undefined, doneTasks }
}
