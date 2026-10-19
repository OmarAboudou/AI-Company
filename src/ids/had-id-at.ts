import type { IdHistory } from "./id-history-schema.ts"

export function hadId(entity: IdHistory, id: string, at: string): boolean {
    const moment = Date.parse(at)
    let since =
        entity.createdAt === undefined
            ? Number.NEGATIVE_INFINITY
            : Date.parse(entity.createdAt)
    for (const former of entity.formerIds ?? []) {
        const until = Date.parse(former.until)
        if (former.id === id && since <= moment && moment < until) {
            return true
        }
        since = until
    }
    return entity.id === id && since <= moment
}
