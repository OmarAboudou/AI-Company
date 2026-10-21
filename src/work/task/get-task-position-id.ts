import { getCurrentId } from "../../ids/get-current-id.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Task } from "./schema.ts"

export function getTaskPositionId(
    task: Task,
    positions: readonly IdHistory[],
): string {
    return getCurrentId(positions, task.positionId, task.askedAt)
}
