import { builtInListeners } from "./listener/built-in/built-in.ts"
import type { Listener } from "./listener/define-listener.ts"
import { builtInTaskTypes } from "./task-type/built-in/built-in.ts"
import type { TaskType } from "./task-type/define-task-type.ts"

export type WorkCatalog = {
    taskTypes: Record<string, TaskType>
    listeners: Listener[]
}

export const builtInWorkCatalog: WorkCatalog = {
    taskTypes: builtInTaskTypes,
    listeners: builtInListeners,
}
