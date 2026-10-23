import type { Journal } from "../../journal/schema.ts"
import { formatPositionLabel } from "../../messaging/message/format-position-label.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { getPositionsWorkedBy } from "../../organization/human/get-positions-worked-by.ts"
import {
    type CurrentHuman,
    readCurrentHuman,
} from "../../organization/human/read-current-human.ts"
import { readCurrentPositionId } from "../../organization/human/read-current-position-id.ts"
import { requirePositionsToWork } from "../../organization/human/require-positions-to-work.ts"
import { listPositionAssignments } from "../../organization/position/list-position-assignments.ts"
import type { Position } from "../../organization/position/schema.ts"
import { UserError } from "../../user-error.ts"
import { loadResumableRun } from "../run/load-resumable-run.ts"
import type { Run } from "../run/schema.ts"
import { getTaskPositionId } from "../task/get-task-position-id.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import type { Task } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"

export type RunInProgress = {
    human: CurrentHuman
    task: Task
    position: Position
    run: Run
}

function formatPositionLabels(runsInProgress: RunInProgress[]): string {
    const labels = runsInProgress.map(({ position }) =>
        formatPositionLabel(position),
    )
    return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
}

export async function requireRunInProgress(
    journal: Journal,
    environment: NodeJS.ProcessEnv,
): Promise<RunInProgress> {
    const { projectRoot } = journal
    await requireCompany(projectRoot)
    const [human, assignments, tasks] = await Promise.all([
        readCurrentHuman(projectRoot, environment),
        listPositionAssignments(projectRoot),
        listTasks(projectRoot),
    ])
    const positionsToWork = requirePositionsToWork(
        human,
        getPositionsWorkedBy(assignments, human).map(
            ({ position }) => position,
        ),
        readCurrentPositionId(environment),
    )
    const taskStates = getTaskStates(tasks, journal.events)
    const positions = assignments.map(({ position }) => position)
    const runsInProgress: RunInProgress[] = []
    for (const task of tasks) {
        const positionId = getTaskPositionId(task, positions)
        const position = positionsToWork.find(({ id }) => id === positionId)
        if (taskStates.get(task.id) !== "running" || position === undefined) {
            continue
        }
        const run = await loadResumableRun(journal, task, human)
        if (run !== undefined) {
            runsInProgress.push({ human, task, position, run })
        }
    }
    const [runInProgress, ...otherRunsInProgress] = runsInProgress
    if (runInProgress === undefined) {
        throw new UserError(
            "No task of yours is in progress: run `aico task next` to open one.",
        )
    }
    if (otherRunsInProgress.length > 0) {
        throw new UserError(
            `You have tasks in progress as ${formatPositionLabels(runsInProgress)}: select the position to answer from with \`aico current-position set <position-id>\`.`,
        )
    }
    return runInProgress
}
