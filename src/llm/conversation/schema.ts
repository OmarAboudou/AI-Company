import { z } from "zod"

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
