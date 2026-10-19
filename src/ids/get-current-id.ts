import { hadIdAt } from "./had-id-at.ts"
import type { IdHistory } from "./id-history-schema.ts"

export function getCurrentId(
    entities: IdHistory[],
    id: string,
    at: string,
): string {
    return entities.find((entity) => hadIdAt(entity, id, at))?.id ?? id
}
