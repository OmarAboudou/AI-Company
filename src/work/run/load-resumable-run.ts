import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { Journal } from "../../journal/schema.ts"
import type { CurrentHuman } from "../../organization/human/read-current-human.ts"
import { type Task, taskStartedEventType } from "../task/schema.ts"
import type { Run } from "./schema.ts"
import { hasRun, loadRun } from "./storage.ts"

// A run this person started, on this machine, can go on; any other, such
// as an interrupted model's, is started afresh, as llmco run would.
export async function loadResumableRun(
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
