import type { IdHistory } from "./id-history-schema.ts"

export function withNewId<Entity extends IdHistory>(
    entity: Entity,
    newId: string,
    until: string,
): Entity {
    const formerIds = [...(entity.formerIds ?? []), { id: entity.id, until }]
    return { ...entity, id: newId, formerIds }
}
