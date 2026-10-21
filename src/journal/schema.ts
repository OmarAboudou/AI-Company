import { z } from "zod"
import { createTolerantSchema } from "../create-tolerant-schema.ts"
import { IdSchema } from "../ids/id-schema.ts"

const OccurredAtSchema = z.iso.datetime().meta({
    description: "When it happened, in UTC.",
})

const DepthSchema = z.int().min(0).meta({
    description:
        "How many tasks led to it, each caused by the one before: 0 for what a person does. A task created from an event of depth d has depth d + 1, and so has what its run causes.",
})

export function defineEventType<
    Type extends string,
    Fields extends z.ZodRawShape,
>({
    type,
    description,
    fields,
}: {
    type: Type
    description: string
    fields: Fields
}) {
    const recordingSchema = z
        .strictObject({
            type: z.literal(type),
            occurredAt: OccurredAtSchema,
            depth: DepthSchema,
            ...fields,
        })
        .meta({ description })
    const readingSchema = createTolerantSchema(recordingSchema) as z.ZodType<
        z.output<typeof recordingSchema>
    >
    return { type, recordingSchema, readingSchema }
}

export const JournalEventSchema = z
    .looseObject({
        type: IdSchema.meta({
            description:
                "The event's type, which defines its other fields, e.g. message-sent.",
        }),
        occurredAt: OccurredAtSchema,
        depth: DepthSchema,
    })
    .meta({
        title: "llmco event",
        description:
            "An event of the company's journal, in .llmco/journal/<event-id>.json, the id being the time it happened followed by a random suffix. Written by llmco and never modified: the journal keeps, in git, what happened in the company. Every event has a type, the time it happened and a depth; its other fields are its type's.",
    })

type EventContent = { type: string; occurredAt: string; depth: number }

export type JournalEvent = EventContent & { id: string }

export type Journal = { projectRoot: string; events: JournalEvent[] }

export type EventType<Content extends EventContent = EventContent> = {
    type: string
    recordingSchema: z.ZodType<Content>
    readingSchema: z.ZodType<Content>
}

export type EventOfType<Type extends EventType> = z.output<
    Type["recordingSchema"]
> & {
    id: string
}
