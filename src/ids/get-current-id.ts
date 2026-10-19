import { hadId } from "./had-id-at.ts"
import type { IdHistory } from "./id-history-schema.ts"

export function currentId(
    entities: IdHistory[],
    id: string,
    at: string,
): string {
    return entities.find((entity) => hadId(entity, id, at))?.id ?? id
}
