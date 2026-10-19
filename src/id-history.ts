import { z } from "zod"
import { readConfig } from "./files/read-json-file.ts"
import { IdSchema } from "./id.ts"

export const IdHistorySchema = z
    .strictObject({
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
    })
    .meta({
        title: "llmco id history",
        description:
            "When a position or an employee was created and the ids it had before, in history.json next to its config.json. Written by llmco, not by hand: absent for one created before llmco recorded it.",
    })

export type IdHistoryRecord = z.infer<typeof IdHistorySchema>

export async function loadIdHistory(
    projectRoot: string,
    path: string,
): Promise<IdHistoryRecord> {
    if (!(await Bun.file(path).exists())) {
        return {}
    }
    return readConfig(projectRoot, path, IdHistorySchema)
}

export async function saveIdHistory(
    path: string,
    { createdAt, formerIds }: IdHistoryRecord,
): Promise<void> {
    if (createdAt === undefined && formerIds === undefined) {
        return
    }
    await Bun.write(
        path,
        `${JSON.stringify({ createdAt, formerIds }, null, 4)}\n`,
    )
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

export function currentId(
    entities: IdHistory[],
    id: string,
    at: string,
): string {
    return entities.find((entity) => hadId(entity, id, at))?.id ?? id
}

export function wrote(
    employee: IdHistory,
    { employee: author, sentAt }: { employee?: { id: string }; sentAt: string },
): boolean {
    return author !== undefined && hadId(employee, author.id, sentAt)
}
