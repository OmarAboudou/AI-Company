import { z } from "zod"
import { IdSchema } from "../ids/id-schema.ts"

const OccurredAtSchema = z.iso.datetime().meta({
    description: "When it happened, in UTC.",
})

const DepthSchema = z.int().min(0).meta({
    description:
        "How many tasks led to it, each caused by the one before: 0 for what a person does. A task created from an event of depth d has depth d + 1, and so has what its run causes.",
})

const MessageSentEventSchema = z
    .strictObject({
        type: z.literal("message-sent").meta({
            description: "message-sent: a message was added to a thread.",
        }),
        occurredAt: OccurredAtSchema,
        depth: DepthSchema,
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
    })
    .meta({ description: "A message was added to a thread." })

export const JournalEventSchema = z
    .discriminatedUnion("type", [MessageSentEventSchema])
    .meta({
        title: "llmco event",
        description:
            "An event of the company's journal, in .llmco/journal/<event-id>.json, the id being the time it happened followed by a random suffix. Written by llmco and never modified: the journal keeps, in git, what happened in the company.",
    })

export type JournalEvent = z.infer<typeof JournalEventSchema> & { id: string }
