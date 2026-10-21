import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType } from "../../journal/schema.ts"

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
