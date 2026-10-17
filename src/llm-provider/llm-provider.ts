import { z } from "zod"

export const LlmProviderConfigSchema = z
    .strictObject({
        name: z.string().trim().min(1).meta({
            description: "Display name of the LLM provider, e.g. Anthropic.",
        }),
    })
    .meta({
        title: "llmco LLM provider",
        description:
            "Configuration of an LLM provider, in .llmco/llm-providers/<provider-id>/config.json. Its models live next to it, in models/<model-id>/config.json.",
    })

export type LlmProviderConfig = z.infer<typeof LlmProviderConfigSchema>

export type LlmProvider = LlmProviderConfig & {
    id: string
}
