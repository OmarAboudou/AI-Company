import { z } from "zod"
import { createTolerantSchema } from "../../../../create-tolerant-schema.ts"
import { IdSchema } from "../../../../ids/id-schema.ts"

export const catchUpThreadTypeName = "catch-up-thread"

export const CatchUpThreadParamsSchema = z.strictObject({
    threadId: IdSchema.meta({
        description:
            "Id of the thread to catch up on, i.e. the name of its folder in .llmco/threads.",
    }),
})

export const CatchUpThreadResultSchema = z.strictObject({
    lastReadEntryId: IdSchema.optional().meta({
        description:
            "The last of the thread's entries read, i.e. the name of its folder in the thread's messages; absent when the task read nothing. The latest of these among a position's catch-ups of a thread is the position's read marker there: it moves only when a catch-up is done.",
    }),
})

export type CatchUpThreadResult = z.infer<typeof CatchUpThreadResultSchema>

export const CatchUpThreadResultReadingSchema = createTolerantSchema(
    CatchUpThreadResultSchema,
) as z.ZodType<CatchUpThreadResult>
