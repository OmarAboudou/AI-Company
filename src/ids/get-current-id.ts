import { hadIdAt } from "./had-id-at.ts"
import type { IdHistory } from "./id-history-schema.ts"

export function getCurrentId(
    entities: readonly IdHistory[],
    usedId: string,
    usedAt: string,
): string {
    return (
        entities.find((entity) => hadIdAt(entity, usedId, usedAt))?.id ?? usedId
    )
}
