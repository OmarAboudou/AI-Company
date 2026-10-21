import { z } from "zod"
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
    const schema = z
        .strictObject({
            type: z.literal(type),
            occurredAt: OccurredAtSchema,
            depth: DepthSchema,
            ...fields,
        })
        .meta({ description })
    return { type, schema }
}

export const messageSentEventType = defineEventType({
    type: "message-sent",
    description: "A message was added to a thread.",
    fields: {
        threadId: IdSchema.meta({
            description:
                "Id of the thread, i.e. the name of its folder in .llmco/threads.",
        }),
        messageId: IdSchema.meta({
            description:
                "Id of the message, i.e. the name of its folder in the thread's messages. Recorded just before the message is written: an interrupted sending can leave it naming no message.",
        }),
        mentions: z.array(IdSchema).meta({
            description:
                "Ids of the positions the message mentions, as its message.json records them.",
        }),
    },
})

const TaskIdSchema = IdSchema.meta({
    description: "Id of the task, i.e. the name of its file in .llmco/tasks.",
})

export const taskCreatedEventType = defineEventType({
    type: "task-created",
    description:
        "A task was created for a position, and waits for whoever works it.",
    fields: { taskId: TaskIdSchema },
})

export const taskStartedEventType = defineEventType({
    type: "task-started",
    description: "Whoever works the task's position started it.",
    fields: { taskId: TaskIdSchema },
})

export const taskCompletedEventType = defineEventType({
    type: "task-completed",
    description: "The task was done.",
    fields: {
        taskId: TaskIdSchema,
        summary: z.string().trim().min(1).meta({
            description: "What was done, as whoever did it sums it up.",
        }),
    },
})

export const taskFailedEventType = defineEventType({
    type: "task-failed",
    description: "The task was given up.",
    fields: {
        taskId: TaskIdSchema,
        reason: z.string().trim().min(1).meta({
            description: "Why the task was given up.",
        }),
    },
})

export const chainStoppedEventType = defineEventType({
    type: "chain-stopped",
    description:
        "llmco created no task for an event, whose chain of tasks had reached the company's maxTaskDepth.",
    fields: {
        causeEventId: IdSchema.meta({
            description:
                "Id of the event the task would have been created for, i.e. the name of its file in .llmco/journal.",
        }),
        stoppedTask: z
            .strictObject({
                type: IdSchema,
                positionId: IdSchema,
                params: z.record(z.string(), z.unknown()),
            })
            .meta({
                description:
                    "The task the chain stopped before, as a listener asked for it: its type, the position it was for and its parameters.",
            }),
    },
})

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

export type EventType<Content extends EventContent = EventContent> = {
    type: string
    schema: z.ZodType<Content>
}

export type EventOfType<Type extends EventType> = z.output<Type["schema"]> & {
    id: string
}

export type ChainStoppedEvent = EventOfType<typeof chainStoppedEventType>
