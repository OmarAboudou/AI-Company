import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType, type EventOfType } from "../../journal/schema.ts"
import { RunIdSchema, TokenUsageSchema } from "../run/schema.ts"

export const TaskSchema = z
    .strictObject({
        createdAt: z.iso.datetime().meta({
            description: "When the task was created, in UTC.",
        }),
        type: IdSchema.meta({
            description:
                "Id of the task's type, which builds, each time the task runs, what its run is given from the parameters, e.g. catch-up-thread to catch up on a thread.",
        }),
        params: z.record(z.string(), z.unknown()).meta({
            description:
                "The task's parameters, as its type expects them, e.g. the threadId of the thread to catch up on.",
        }),
        positionId: IdSchema.meta({
            description:
                "Id of the position the task is for: whoever works the position does it.",
        }),
        parentTaskId: IdSchema.optional().meta({
            description:
                "Id of the task it is a part of, in a tree of tasks. Absent for a task of its own.",
        }),
        causeEventId: IdSchema.meta({
            description:
                "Id of the event the task was created for, i.e. the name of its file in .llmco/journal. The task's depth is that event's, plus one.",
        }),
    })
    .meta({
        title: "llmco task",
        description:
            "A task for a position, in .llmco/tasks/<task-id>.json, the id being the time it was created followed by a random suffix. Never modified: the task's state comes from the journal's events.",
    })

export type Task = z.infer<typeof TaskSchema> & { id: string }

export type NewTask = Pick<Task, "type" | "positionId" | "params">

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
    description: "Whoever works the task's position started a run of it.",
    fields: {
        taskId: TaskIdSchema,
        runId: RunIdSchema,
        employeeId: IdSchema.optional().meta({
            description:
                "Id of the employee doing the run, i.e. the name of its folder in .llmco/employees. Absent when the directors do it.",
        }),
        model: z
            .strictObject({ providerId: IdSchema, modelId: IdSchema })
            .optional()
            .meta({
                description:
                    "The model an LLM employee does the run with: its provider's id and its own, in .llmco/llm-providers.",
            }),
    },
})

export const taskCompletedEventType = defineEventType({
    type: "task-completed",
    description: "The task was done.",
    fields: {
        taskId: TaskIdSchema,
        summary: z.string().trim().min(1).meta({
            description: "What was done, as whoever did it sums it up.",
        }),
        runId: RunIdSchema.optional().meta({
            description:
                "Id of the run that completed the task. Absent when it was completed outside a run.",
        }),
        usage: TokenUsageSchema.optional(),
        lastReadEntryId: IdSchema.optional().meta({
            description:
                "For a task catching up on a thread: the last of the thread's entries read, i.e. the name of its folder in the thread's messages. The latest of these events among a position's catch-up tasks for a thread is the position's read marker there: it moves only when such a task completes.",
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
        runId: RunIdSchema.optional().meta({
            description:
                "Id of the run that gave the task up. Absent when it was given up outside a run.",
        }),
        usage: TokenUsageSchema.optional(),
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

export type ChainStoppedEvent = EventOfType<typeof chainStoppedEventType>
