import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"

export const RunIdSchema = IdSchema.meta({
    description:
        "Id of the run, i.e. the name of its transcript in .llmco/.state/runs, kept on the machine that ran it.",
})

export const TokenUsageSchema = z
    .strictObject({
        inputTokens: z.int().min(0),
        outputTokens: z.int().min(0),
        cacheReadInputTokens: z.int().min(0),
        cacheCreationInputTokens: z.int().min(0),
    })
    .meta({
        description:
            "The tokens that the run's requests used, as the provider counted them: the input tokens read from the prompt cache and those written to it count apart from the others, at their own prices.",
    })

export type TokenUsage = z.infer<typeof TokenUsageSchema>
