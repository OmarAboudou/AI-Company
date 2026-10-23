import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType, type EventOfType } from "../../journal/schema.ts"
import { TokenUsageSchema } from "../../llm/conversation/schema.ts"
import { WorkerSchema } from "../../organization/position/schema.ts"
import { RunIdSchema } from "../run/schema.ts"

export const TaskSchema = z
    .strictObject({
        askedAt: z.iso.datetime().meta({
            description:
                "When the task was asked for, i.e. when the event that caused it happened, in UTC: positionId names the position as it was called then.",
        }),
        type: IdSchema.meta({
            description:
                "Id of the task's type, which builds, each time the task runs, what its run is given from the parameters.",
        }),
        params: z.record(z.string(), z.unknown()).meta({
            description: "The task's parameters, as its type expects them.",
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
                "Id of the event the task was created for, i.e. the name of its file in .aico/journal. The task's depth is that event's, plus one.",
        }),
    })
    .meta({
        title: "AICo task",
        description:
            "A task for a position, in .aico/tasks/<task-id>.json, the id being its cause event's followed by a hash of its type, position and parameters, so that two machines asking for the same task write the same file. Never modified: the task's state comes from the journal's events.",
    })

export type Task = z.infer<typeof TaskSchema> & { id: string }

export type UncreatedTask = Pick<Task, "type" | "positionId" | "params">

export const TaskResultSchema = z.record(z.string(), z.unknown()).meta({
    description: "What the task produced, as its type defines and checks it.",
})

export type TaskResult = z.infer<typeof TaskResultSchema>

const TaskIdSchema = IdSchema.meta({
    description: "Id of the task, i.e. the name of its file in .aico/tasks.",
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
        worker: WorkerSchema.meta({
            description:
                "Who does the run, working the task's position: an employee, or the directors themselves.",
        }),
        model: z
            .strictObject({ providerId: IdSchema, modelId: IdSchema })
            .optional()
            .meta({
                description:
                    "The model an LLM employee does the run with: its provider's id and its own, in .aico/llm-providers.",
            }),
    },
})

export const taskDoneEventType = defineEventType({
    type: "task-done",
    description:
        "The task's session ended normally, whatever it decided for the task's ticket: at an act that passed the hand, or when its worker stopped.",
    fields: {
        taskId: TaskIdSchema,
        hasPassedHand: z.boolean().meta({
            description:
                "Whether the session ended at an act that passed the hand on its ticket, rather than when its worker stopped without passing it.",
        }),
        summary: z.string().trim().min(1).optional().meta({
            description:
                "What was done, as whoever did it sums it up, when they marked the task as done.",
        }),
        runId: RunIdSchema.optional().meta({
            description:
                "Id of the run in which the task was marked as done. Absent when it was done outside a run, as when a listener marks it as done.",
        }),
        usage: TokenUsageSchema.optional(),
        result: TaskResultSchema,
    },
})

export type TaskDoneEvent = EventOfType<typeof taskDoneEventType>

export const taskCancelledEventType = defineEventType({
    type: "task-cancelled",
    description:
        "The task became pointless: it waited in its position's queue, or its run stopped at its next step.",
    fields: {
        taskId: TaskIdSchema,
        reason: z.string().trim().min(1).meta({
            description: "Why the task became pointless.",
        }),
        runId: RunIdSchema.optional().meta({
            description:
                "Id of the run that stopped. Absent when the task was cancelled before it started.",
        }),
        usage: TokenUsageSchema.optional(),
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
