import type { IdHistory } from "./id-history-schema.ts"

export function hadIdAt(
    entity: IdHistory,
    id: string,
    moment: string,
): boolean {
    const momentTime = Date.parse(moment)
    let periodStart =
        entity.createdAt === undefined
            ? Number.NEGATIVE_INFINITY
            : Date.parse(entity.createdAt)
    for (const { id: formerId, until } of entity.formerIds ?? []) {
        const periodEnd = Date.parse(until)
        if (
            formerId === id &&
            periodStart <= momentTime &&
            momentTime < periodEnd
        ) {
            return true
        }
        periodStart = periodEnd
    }
    return entity.id === id && periodStart <= momentTime
}
