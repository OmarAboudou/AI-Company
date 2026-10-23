import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"

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
            "The journal's events that this machine has dispatched to the listeners, in .aico/.state/dispatched-events.json. Written by llmco and ignored by git: another machine dispatches them again, and finds the tasks they created.",
    })
