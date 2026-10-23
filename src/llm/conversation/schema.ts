import { z } from "zod"
import { ProtocolSchema } from "../connection/schema.ts"

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

export const TextBlockSchema = z.strictObject({
    type: z.literal("text"),
    text: z.string(),
})

export type TextBlock = z.infer<typeof TextBlockSchema>

export const ToolCallBlockSchema = z.strictObject({
    type: z.literal("tool-call"),
    id: z.string().min(1).meta({
        description:
            "Id of the call, which its result names: the model's own, or the one AICo gives a person's call.",
    }),
    name: z.string().min(1).meta({
        description: "Name of the tool called, e.g. message_send.",
    }),
    input: z.unknown().meta({
        description:
            "The call's input, as it was written: the tool checks it against its schema when the call runs.",
    }),
})

export type ToolCallBlock = z.infer<typeof ToolCallBlockSchema>

export const ToolResultBlockSchema = z.strictObject({
    type: z.literal("tool-result"),
    toolCallId: z.string().min(1).meta({
        description: "Id of the call this is the result of.",
    }),
    text: z.string().meta({
        description: "The result, as whoever called the tool is given it.",
    }),
    isError: z.boolean().meta({
        description:
            "Whether the call was refused or failed, its text saying why.",
    }),
})

export type ToolResultBlock = z.infer<typeof ToolResultBlockSchema>

export const UserTurnSchema = z
    .strictObject({
        role: z.literal("user"),
        blocks: z.array(
            z.discriminatedUnion("type", [
                TextBlockSchema,
                ToolResultBlockSchema,
            ]),
        ),
    })
    .meta({
        description:
            "A turn AICo gives: the task's message, or the results of the tool calls.",
    })

export type UserTurn = z.infer<typeof UserTurnSchema>

const TurnStopSchema = z
    .discriminatedUnion("reason", [
        z.strictObject({ reason: z.literal("end") }),
        z.strictObject({ reason: z.literal("max-length") }),
        z.strictObject({ reason: z.literal("context-window-exceeded") }),
        z.strictObject({
            reason: z.literal("refusal"),
            category: z.string().optional(),
        }),
    ])
    .meta({
        description:
            "Why the model stopped: it ended its turn (end), it was cut at its maximum length or by its context window, or its provider refused to go on.",
    })

export type TurnStop = z.infer<typeof TurnStopSchema>

const ModelResponseSchema = z
    .strictObject({
        protocol: ProtocolSchema,
        payload: z.unknown().meta({
            description:
                "The provider's response, untouched: the turn is replayed from it in the next requests of its run, signed reasoning included.",
        }),
        usage: TokenUsageSchema,
        stop: TurnStopSchema,
    })
    .meta({
        description:
            "The response of the model that took the turn, through its protocol. Absent for a person's turn.",
    })

export type ModelResponse = z.infer<typeof ModelResponseSchema>

export const AssistantTurnSchema = z
    .strictObject({
        role: z.literal("assistant"),
        blocks: z.array(
            z.discriminatedUnion("type", [
                TextBlockSchema,
                ToolCallBlockSchema,
            ]),
        ),
        modelResponse: ModelResponseSchema.optional(),
    })
    .meta({
        description:
            "A turn of whoever works the task, a model or a person: its texts and tool calls, in their order.",
    })

export type AssistantTurn = z.infer<typeof AssistantTurnSchema>

export type ModelTurn = AssistantTurn & { modelResponse: ModelResponse }

export const ConversationTurnSchema = z.discriminatedUnion("role", [
    UserTurnSchema,
    AssistantTurnSchema,
])

export type ConversationTurn = z.infer<typeof ConversationTurnSchema>

export const ToolDefinitionSchema = z.strictObject({
    name: z.string().min(1),
    description: z.string(),
    inputSchema: z.record(z.string(), z.unknown()).meta({
        description: "The tool's input, as a JSON Schema.",
    }),
})

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>

export type Conversation = {
    systemPrompt: string
    tools: ToolDefinition[]
    turns: ConversationTurn[]
}
