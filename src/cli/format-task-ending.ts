import type { TaskEnding } from "../work/tool/define-tool.ts"

export function formatTaskEnding(taskEnding: TaskEnding): string {
    switch (taskEnding.state) {
        case "done":
            if (taskEnding.summary !== undefined) {
                return `Task done: ${taskEnding.summary}`
            }
            return taskEnding.hasPassedHand
                ? "Task done: its session passed the hand."
                : "Task done: its session ended without passing the hand."
        case "failed":
            return `Task failed: ${taskEnding.reason}`
        case "cancelled":
            return `Task cancelled: ${taskEnding.reason}`
    }
}
