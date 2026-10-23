import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType } from "../../journal/schema.ts"

export const eventsDispatchedEventType = defineEventType({
    type: "events-dispatched",
    description:
        "AICo gave these events of the journal to its listeners, which applied what they asked for, such as creating a task. A dispatching records it once done, so that no clone nor machine gives them again.",
    fields: {
        eventIds: z.array(IdSchema).min(1).meta({
            description:
                "Ids of the events given to the listeners, oldest first.",
        }),
    },
})
