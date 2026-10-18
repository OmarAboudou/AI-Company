import { z } from "zod"
import { IdSchema } from "./id.ts"

export const idHistoryShape = {
    createdAt: z.iso.datetime().optional().meta({
        description:
            "When it was created, in UTC. Absent if it was created before llmco recorded it: it then counts as existing since always.",
    }),
    formerIds: z
        .array(
            z.strictObject({
                id: IdSchema,
                until: z.iso.datetime().meta({
                    description: "When it stopped having this id, in UTC.",
                }),
            }),
        )
        .optional()
        .meta({
            description:
                "Ids it had before, oldest first, added by update-id. Threads keep the ids they were written with: a former id still designates it in messages written before the change.",
        }),
}

export type IdHistory = {
    id: string
    createdAt?: string
    formerIds?: { id: string; until: string }[]
}

export function withNewId<Entity extends IdHistory>(
    entity: Entity,
    newId: string,
    until: string,
): Entity {
    const formerIds = [...(entity.formerIds ?? []), { id: entity.id, until }]
    return { ...entity, id: newId, formerIds }
}
