import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType, type EventOfType } from "../../journal/schema.ts"

export const DispatchedEventsSchema = z
    .strictObject({
        eventIds: z.array(IdSchema).meta({
            description:
                "Ids of the journal's events that this machine has given to llmco's listeners, oldest first.",
        }),
    })
    .meta({
        title: "llmco dispatched events",
        description:
            "The journal's events that this machine has dispatched to the listeners, in .llmco/.state/dispatched-events.json. Written by llmco and ignored by git: another machine dispatches them again, and finds the tasks they created.",
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
