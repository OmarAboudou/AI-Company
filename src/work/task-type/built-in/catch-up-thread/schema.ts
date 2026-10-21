import { z } from "zod"
import { IdSchema } from "../../../../ids/id-schema.ts"

export const CatchUpThreadParamsSchema = z.strictObject({
    threadId: IdSchema.meta({
        description:
            "Id of the thread to catch up on, i.e. the name of its folder in .llmco/threads.",
    }),
})
