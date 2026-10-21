import type { TaskType } from "../define-task-type.ts"
import { catchUpThreadTaskType } from "./catch-up-thread/catch-up-thread.ts"

export const builtInTaskTypes: Record<string, TaskType> = {
    "catch-up-thread": catchUpThreadTaskType,
}
