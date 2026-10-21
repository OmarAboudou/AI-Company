import { createHash } from "node:crypto"
import { getWithSortedKeys } from "./get-with-sorted-keys.ts"
import type { UncreatedTask } from "./schema.ts"

export function createTaskId(
    causeEventId: string,
    { type, positionId, params }: UncreatedTask,
): string {
    const definition = JSON.stringify(
        getWithSortedKeys({ type, positionId, params }),
    )
    const hash = createHash("sha256").update(definition).digest("hex")
    return `${causeEventId}-${hash.slice(0, 8)}`
}
