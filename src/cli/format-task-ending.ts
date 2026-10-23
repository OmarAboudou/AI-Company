import type { TaskEnding } from "../work/tool/define-tool.ts"

export function formatTaskEnding(taskEnding: TaskEnding): string {
    switch (taskEnding.state) {
        case "done":
            return `Task done: ${taskEnding.summary}`
        case "failed":
            return `Task failed: ${taskEnding.reason}`
        case "cancelled":
            return `Task cancelled: ${taskEnding.reason}`
    }
}
