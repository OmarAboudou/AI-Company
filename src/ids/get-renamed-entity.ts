import type { IdHistory } from "./id-history-schema.ts"

export function getRenamedEntity<Entity extends IdHistory>(
    entity: Entity,
    newId: string,
    renamedAt: string,
): Entity {
    const formerIds = [
        ...(entity.formerIds ?? []),
        { id: entity.id, until: renamedAt },
    ]
    return { ...entity, id: newId, formerIds }
}
