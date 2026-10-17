import { z } from "zod"

export const LlmModelConfigSchema = z
    .strictObject({
        name: z.string().trim().min(1).meta({
            description: "Display name of the model, e.g. Claude Opus 5.5.",
        }),
        apiId: z.string().trim().min(1).meta({
            description:
                "Id of the model on the provider's side, as its API expects it, e.g. claude-opus-5-5 or llama3.1:8b.",
        }),
    })
    .meta({
        title: "llmco LLM model",
        description:
            "Configuration of a model served by an LLM provider, in .llmco/llm-providers/<provider-id>/models/<model-id>/config.json.",
    })

export type LlmModelConfig = z.infer<typeof LlmModelConfigSchema>

export type LlmModel = LlmModelConfig & {
    provider: string
    id: string
}
