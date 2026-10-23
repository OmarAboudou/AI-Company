import { z } from "zod"
import { IdSchema } from "./id-schema.ts"

export const IdHistorySchema = z
    .strictObject({
        createdAt: z.iso.datetime().optional().meta({
            description:
                "When it was created, in UTC. Absent if it was created before AICo recorded it: it then counts as existing since always.",
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
        title: "AICo id history",
        description:
            "When a position or an employee was created and the ids it had before, in history.json next to its config.json. Written by AICo, not by hand: absent for one created before AICo recorded it.",
    })

export type IdHistoryRecord = z.infer<typeof IdHistorySchema>

export type IdHistory = {
    id: string
    createdAt?: string
    formerIds?: { id: string; until: string }[]
}
