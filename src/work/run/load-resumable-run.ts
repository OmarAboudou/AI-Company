import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { Journal } from "../../journal/schema.ts"
import { isWorkedByDirectors } from "../../organization/human/is-worked-by-directors.ts"
import { type Task, taskStartedEventType } from "../task/schema.ts"
import type { Run } from "./schema.ts"
import { hasRun, loadRun } from "./storage.ts"

// A run the directors started, on this machine, can go on; any other, such
// as an interrupted model's, is started afresh, as aico run would.
export async function loadResumableRun(
    journal: Journal,
    task: Task,
): Promise<Run | undefined> {
    const taskStartedEvent = journal.events
        .map((event) => getEventOfType(event, taskStartedEventType))
        .findLast((startedEvent) => startedEvent?.taskId === task.id)
    if (
        taskStartedEvent === undefined ||
        !isWorkedByDirectors(taskStartedEvent.worker)
    ) {
        return undefined
    }
    const { projectRoot } = journal
    const { runId } = taskStartedEvent
    return (await hasRun(projectRoot, runId))
        ? loadRun(projectRoot, runId)
        : undefined
}
