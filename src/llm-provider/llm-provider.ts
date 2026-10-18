import { z } from "zod"
import { ConnectionsSchema } from "../llm-connection/llm-connection.ts"

const environmentVariableName =
    "must be an environment variable's name, without $: letters, digits and underscores, not starting with a digit"

const ApiKeySourceSchema = z.discriminatedUnion("kind", [
    z
        .strictObject({
            kind: z.literal("env").meta({
                description:
                    "env: read the API key from an environment variable.",
            }),
            variable: z
                .string()
                .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, environmentVariableName)
                .meta({
                    description:
                        "Name of the environment variable holding the API key, without $, e.g. ANTHROPIC_API_KEY.",
                    patternErrorMessage: environmentVariableName,
                }),
        })
        .meta({
            description: "Read the API key from an environment variable.",
        }),
    z
        .strictObject({
            kind: z.literal("file").meta({
                description: "file: read the API key from a file.",
            }),
            path: z.string().trim().min(1).meta({
                description:
                    "Path of the file holding the API key: absolute, starting with ~, or relative to the project's root.",
            }),
        })
        .meta({ description: "Read the API key from a file." }),
])

export const LlmProviderConfigSchema = z
    .strictObject({
        name: z.string().trim().min(1).meta({
            description: "Display name of the LLM provider, e.g. Anthropic.",
        }),
        apiKey: ApiKeySourceSchema.optional().meta({
            description:
                "Where llmco reads the provider's API key, never the key itself. Absent for servers without authentication, such as a local Ollama.",
        }),
        connections: ConnectionsSchema.optional().meta({
            description:
                "How the provider is reached: one connection per API protocol it speaks, all sharing its API key.",
        }),
    })
    .meta({
        title: "llmco LLM provider",
        description:
            "Configuration of an LLM provider, in .llmco/llm-providers/<provider-id>/config.json. Its models live next to it, in models/<model-id>/config.json.",
    })

export type LlmProviderConfig = z.infer<typeof LlmProviderConfigSchema>

export type ApiKeySource = NonNullable<LlmProviderConfig["apiKey"]>

export type LlmProvider = LlmProviderConfig & {
    id: string
}
