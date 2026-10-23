import Anthropic from "@anthropic-ai/sdk"
import { UserError } from "../../user-error.ts"
import type { Connections } from "../connection/schema.ts"
import type { Conversation, ModelTurn } from "../conversation/schema.ts"
import { getAnthropicTools } from "./get-anthropic-tools.ts"
import { getAnthropicTurns } from "./get-anthropic-turns.ts"
import { getAssistantTurn } from "./get-assistant-turn.ts"

// Every current Claude model accepts it; settings (#35) will give each
// model its own maximum.
const maxTokens = 64_000

const cacheControl: Anthropic.CacheControlEphemeral = { type: "ephemeral" }

// Without a key, the SDK would look for credentials on this machine
// (ANTHROPIC_API_KEY, `ant auth login` profiles) and could send them to
// another server than Anthropic's.
class AnthropicWithoutLocalCredentials extends Anthropic {
    protected override _shouldResolveDefaultCredentials(): boolean {
        return false
    }
}

export type AnthropicMessagesCall = {
    connection: NonNullable<Connections["anthropic-messages"]>
    apiKey: string | undefined
    apiId: string
    conversation: Conversation
    onText: (text: string) => void
    signal?: AbortSignal
}

function getTurnsCachedToTheEnd(
    turns: Anthropic.MessageParam[],
): Anthropic.MessageParam[] {
    const lastTurn = turns.at(-1)
    if (lastTurn === undefined) {
        return turns
    }
    const content: Anthropic.ContentBlockParam[] =
        typeof lastTurn.content === "string"
            ? [{ type: "text", text: lastTurn.content }]
            : lastTurn.content
    const lastBlock = content.at(-1)
    if (lastBlock?.type !== "text" && lastBlock?.type !== "tool_result") {
        return turns
    }
    const cachedLastBlock = { ...lastBlock, cache_control: cacheControl }
    return [
        ...turns.slice(0, -1),
        { ...lastTurn, content: [...content.slice(0, -1), cachedLastBlock] },
    ]
}

export async function callAnthropicMessages({
    connection,
    apiKey,
    apiId,
    conversation,
    onText,
    signal,
}: AnthropicMessagesCall): Promise<ModelTurn> {
    const isBearerAuth = connection.auth === "bearer"
    const client = new AnthropicWithoutLocalCredentials({
        baseURL: connection.baseUrl,
        apiKey: isBearerAuth ? null : (apiKey ?? null),
        authToken: isBearerAuth ? (apiKey ?? null) : null,
        ...(apiKey === undefined && { defaultHeaders: { "x-api-key": null } }),
    })
    const tools = getAnthropicTools(conversation.tools)
    try {
        const message = await client.messages
            .stream(
                {
                    model: apiId,
                    max_tokens: maxTokens,
                    // Two cache breakpoints: the system prompt's covers the tools
                    // and the system prompt, which every run of an employee in a
                    // position shares; the last block's covers the conversation,
                    // which each request of a tool loop extends.
                    system: [
                        {
                            type: "text",
                            text: conversation.systemPrompt,
                            cache_control: cacheControl,
                        },
                    ],
                    ...(tools.length > 0 && { tools }),
                    messages: getTurnsCachedToTheEnd(
                        getAnthropicTurns(conversation.turns),
                    ),
                },
                { signal },
            )
            .on("text", onText)
            .finalMessage()
        return getAssistantTurn(message)
    } catch (error) {
        if (error instanceof Anthropic.APIError) {
            throw new UserError(
                `The anthropic-messages API at ${connection.baseUrl} failed: ${error.message}`,
            )
        }
        throw error
    }
}
