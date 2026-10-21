import { createHash } from "node:crypto"
import type { UncreatedTask } from "./schema.ts"

function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortKeys)
    }
    if (typeof value !== "object" || value === null) {
        return value
    }
    return Object.fromEntries(
        Object.entries(value)
            .sort(([key], [otherKey]) => key.localeCompare(otherKey))
            .map(([key, fieldValue]) => [key, sortKeys(fieldValue)]),
    )
}

export function createTaskId(
    causeEventId: string,
    { type, positionId, params }: UncreatedTask,
): string {
    const definition = JSON.stringify(sortKeys({ type, positionId, params }))
    const hash = createHash("sha256").update(definition).digest("hex")
    return `${causeEventId}-${hash.slice(0, 8)}`
}
