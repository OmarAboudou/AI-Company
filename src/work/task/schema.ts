import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"

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
        depth: z.int().min(1).meta({
            description:
                "How many tasks led to it, itself included, each caused by the one before: d + 1 for a task created from an event of depth d, so 1 for one created from a person's action.",
        }),
        causeEventId: IdSchema.meta({
            description:
                "Id of the event the task was created for, i.e. the name of its file in .llmco/journal.",
        }),
    })
    .meta({
        title: "llmco task",
        description:
            "A task for a position, in .llmco/tasks/<task-id>.json, the id being the time it was created followed by a random suffix. Never modified: the task's state comes from the journal's events.",
    })

export type Task = z.infer<typeof TaskSchema> & { id: string }
