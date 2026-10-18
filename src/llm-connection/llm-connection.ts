import { z } from "zod"

export const protocols = [
    "anthropic-messages",
    "openai-chat-completions",
    "openai-responses",
] as const

export const ProtocolSchema = z.enum(protocols)

export type Protocol = z.infer<typeof ProtocolSchema>

const BaseUrlSchema = z.url({ protocol: /^https?$/ }).meta({
    description:
        "URL the protocol's paths are appended to, e.g. https://api.anthropic.com, or http://localhost:11434/v1 for Ollama's OpenAI-compatible API.",
})

export const authSchemes = ["x-api-key", "bearer"] as const

const AnthropicMessagesConnectionSchema = z
    .strictObject({
        baseUrl: BaseUrlSchema,
        auth: z.enum(authSchemes).optional().meta({
            description:
                "How the API key is sent: an x-api-key header (the default), or an Authorization: Bearer header, as OpenRouter expects.",
        }),
    })
    .meta({ description: "Connection through Anthropic's Messages API." })

const OpenAiConnectionSchema = z.strictObject({ baseUrl: BaseUrlSchema })

export const ConnectionsSchema = z.strictObject({
    "anthropic-messages": AnthropicMessagesConnectionSchema.optional(),
    "openai-chat-completions": OpenAiConnectionSchema.optional().meta({
        description:
            "Connection through OpenAI's Chat Completions API, which sends the API key as a bearer token.",
    }),
    "openai-responses": OpenAiConnectionSchema.optional().meta({
        description:
            "Connection through OpenAI's Responses API, which sends the API key as a bearer token.",
    }),
})

export type Connections = z.infer<typeof ConnectionsSchema>

export type Connection = NonNullable<Connections[Protocol]>
