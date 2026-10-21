import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType, type EventOfType } from "../../journal/schema.ts"
import { TokenUsageSchema } from "../../llm/conversation/schema.ts"
import { RunIdSchema } from "../run/schema.ts"

export const TaskSchema = z
    .strictObject({
        askedAt: z.iso.datetime().meta({
            description:
                "When the task was asked for, i.e. when the event that caused it happened, in UTC: positionId names the position as it was called then.",
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
                "Id of the position the task is for, as it was called when the task was asked for: whoever works the position does it.",
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
            "A task for a position, in .llmco/tasks/<task-id>.json, the id being its cause event's followed by a hash of its type, position and parameters, so that two machines asking for the same task write the same file. Never modified: the task's state comes from the journal's events.",
    })

export type Task = z.infer<typeof TaskSchema> & { id: string }

export type UncreatedTask = Pick<Task, "type" | "positionId" | "params">

export const TaskResultSchema = z.record(z.string(), z.unknown()).meta({
    description:
        "What the task produced, as its type defines and checks it, e.g. the lastReadEntryId of a task catching up on a thread: the last of the thread's entries it read.",
})

export type TaskResult = z.infer<typeof TaskResultSchema>

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

export const taskDoneEventType = defineEventType({
    type: "task-done",
    description:
        "The task was marked as done: whoever worked it says that it is finished.",
    fields: {
        taskId: TaskIdSchema,
        summary: z.string().trim().min(1).meta({
            description: "What was done, as whoever did it sums it up.",
        }),
        runId: RunIdSchema.optional().meta({
            description:
                "Id of the run in which the task was marked as done. Absent when it was done outside a run, as when a message from its position marks a catch-up as done.",
        }),
        usage: TokenUsageSchema.optional(),
        result: TaskResultSchema,
    },
})

export type TaskDoneEvent = EventOfType<typeof taskDoneEventType>

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
