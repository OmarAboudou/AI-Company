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

const TaskIdSchema = IdSchema.meta({
    description: "Id of the task, i.e. the name of its file in .llmco/tasks.",
})

const TaskCreatedEventSchema = z
    .strictObject({
        type: z.literal("task-created").meta({
            description:
                "task-created: a task was created for a position, and waits for whoever works it.",
        }),
        occurredAt: OccurredAtSchema,
        depth: DepthSchema,
        taskId: TaskIdSchema,
    })
    .meta({ description: "A task was created." })

const TaskStartedEventSchema = z
    .strictObject({
        type: z.literal("task-started").meta({
            description:
                "task-started: whoever works the task's position started it.",
        }),
        occurredAt: OccurredAtSchema,
        depth: DepthSchema,
        taskId: TaskIdSchema,
    })
    .meta({ description: "A task was started." })

const TaskCompletedEventSchema = z
    .strictObject({
        type: z.literal("task-completed").meta({
            description: "task-completed: the task was done.",
        }),
        occurredAt: OccurredAtSchema,
        depth: DepthSchema,
        taskId: TaskIdSchema,
        summary: z.string().trim().min(1).meta({
            description: "What was done, as whoever did it sums it up.",
        }),
    })
    .meta({ description: "A task was done." })

const TaskFailedEventSchema = z
    .strictObject({
        type: z.literal("task-failed").meta({
            description: "task-failed: the task was given up.",
        }),
        occurredAt: OccurredAtSchema,
        depth: DepthSchema,
        taskId: TaskIdSchema,
        reason: z.string().trim().min(1).meta({
            description: "Why the task was given up.",
        }),
    })
    .meta({ description: "A task was given up." })

const ChainStoppedEventSchema = z
    .strictObject({
        type: z.literal("chain-stopped").meta({
            description:
                "chain-stopped: llmco created no task for an event, whose chain of tasks had reached the company's maxTaskDepth.",
        }),
        occurredAt: OccurredAtSchema,
        depth: DepthSchema,
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
    })
    .meta({ description: "A chain of tasks was stopped." })

export const JournalEventSchema = z
    .discriminatedUnion("type", [
        MessageSentEventSchema,
        TaskCreatedEventSchema,
        TaskStartedEventSchema,
        TaskCompletedEventSchema,
        TaskFailedEventSchema,
        ChainStoppedEventSchema,
    ])
    .meta({
        title: "llmco event",
        description:
            "An event of the company's journal, in .llmco/journal/<event-id>.json, the id being the time it happened followed by a random suffix. Written by llmco and never modified: the journal keeps, in git, what happened in the company.",
    })

export type JournalEvent = z.infer<typeof JournalEventSchema> & { id: string }

export type ChainStoppedEvent = Extract<JournalEvent, { type: "chain-stopped" }>
