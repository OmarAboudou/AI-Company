import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { Journal } from "../../journal/schema.ts"
import { isHeldByUser } from "../../organization/human/is-held-by-user.ts"
import { type Task, taskStartedEventType } from "../task/schema.ts"
import type { Run } from "./schema.ts"
import { hasRun, loadRun } from "./storage.ts"

// A run the user started, on this machine, can go on; any other, a
// model's left running when its position went back to the user for one,
// is started afresh.
export async function loadResumableRun(
    journal: Journal,
    task: Task,
): Promise<Run | undefined> {
    const taskStartedEvent = journal.events
        .map((event) => getEventOfType(event, taskStartedEventType))
        .findLast((startedEvent) => startedEvent?.taskId === task.id)
    if (
        taskStartedEvent === undefined ||
        !isHeldByUser(taskStartedEvent.worker)
    ) {
        return undefined
    }
    const { projectRoot } = journal
    const { runId } = taskStartedEvent
    return (await hasRun(projectRoot, runId))
        ? loadRun(projectRoot, runId)
        : undefined
}
