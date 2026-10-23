import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import {
    type Task,
    taskFailedEventType,
    taskStartedEventType,
} from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"
import { hasRun, loadRun } from "./storage.ts"

const cutShortReason =
    "Its session was cut short: the process that ran it stopped before it ended."

function isProcessRunning(processId: number): boolean {
    // Before it starts any run, this process runs none: a run naming it is
    // an earlier process's, whose id this one got again.
    if (processId === process.pid) {
        return false
    }
    try {
        process.kill(processId, 0)
        return true
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EPERM"
    }
}

// A model's run lives in the process of the aico run that started it, on
// its machine: once that process is gone without ending the task, nothing
// else will. A run started on another machine can't be told from here.
export async function failCutShortTasks(journal: Journal): Promise<Task[]> {
    const { projectRoot } = journal
    const tasks = await listTasks(projectRoot)
    const taskStates = getTaskStates(tasks, journal.events)
    const startedEvents = journal.events.flatMap((event) => {
        const startedEvent = getEventOfType(event, taskStartedEventType)
        return startedEvent === undefined ? [] : [startedEvent]
    })
    const failedTasks: Task[] = []
    for (const task of tasks) {
        const startedEvent = startedEvents.findLast(
            ({ taskId }) => taskId === task.id,
        )
        if (
            taskStates.get(task.id) !== "running" ||
            startedEvent?.worker.kind !== "employee" ||
            !(await hasRun(projectRoot, startedEvent.runId))
        ) {
            continue
        }
        const { depth, runId } = startedEvent
        const { processId } = await loadRun(projectRoot, runId)
        if (processId !== undefined && isProcessRunning(processId)) {
            continue
        }
        await recordEvent(journal, taskFailedEventType, {
            depth,
            taskId: task.id,
            runId,
            reason: cutShortReason,
        })
        failedTasks.push(task)
    }
    return failedTasks
}
