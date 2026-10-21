import { watchJournal } from "../../../journal/storage.ts"
import { openNextTask } from "../../../work/task/open-next-task.ts"
import { createSessionStop, type SessionStop } from "./create-session-stop.ts"
import { type TaskSession, workTask } from "./work-task.ts"

function isEndingPromptError(error: unknown): boolean {
    return (
        error instanceof Error &&
        (error.name === "AbortPromptError" || error.name === "ExitPromptError")
    )
}

async function workTasksUntilStopped(
    session: TaskSession,
    stop: SessionStop,
): Promise<void> {
    const journalWatch = await watchJournal(session.projectRoot)
    let isWaiting = false
    try {
        while (!stop.signal.aborted) {
            journalWatch.forgetChanges()
            const { openedTask, doneTasks } = await openNextTask(
                session.projectRoot,
                session.environment,
            )
            for (const { task, summary } of doneTasks) {
                console.log(`Task "${task.id}" done at once: ${summary}`)
            }
            if (openedTask !== undefined) {
                isWaiting = false
                await workTask(openedTask, session)
                continue
            }
            if (!isWaiting) {
                console.log("\nWaiting for your next task. Ctrl+D to stop.")
                isWaiting = true
            }
            stop.listenWhileWaiting()
            await Promise.race([journalWatch.waitForChange(), stop.stopped])
        }
    } finally {
        journalWatch.stop()
    }
}

export async function workTasks(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
): Promise<void> {
    const stop = createSessionStop(process.stdin)
    const session = {
        projectRoot,
        environment,
        context: { signal: stop.signal },
    }
    try {
        await workTasksUntilStopped(session, stop)
    } catch (error) {
        if (!isEndingPromptError(error)) {
            throw error
        }
    } finally {
        stop.dispose()
    }
    if (stop.isInterrupted()) {
        process.exitCode = 130
        return
    }
    console.log("\nSession ended.")
}
