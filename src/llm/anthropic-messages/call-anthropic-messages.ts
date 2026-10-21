import Anthropic from "@anthropic-ai/sdk"
import { UserError } from "../../user-error.ts"
import type { Connections } from "../connection/schema.ts"

// Every current Claude model accepts it; settings (#35) will give each
// model its own maximum.
const maxTokens = 64_000

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
    systemPrompt: string
    tools: Anthropic.Tool[]
    turns: Anthropic.MessageParam[]
    onText: (text: string) => void
}

export async function callAnthropicMessages({
    connection,
    apiKey,
    apiId,
    systemPrompt,
    tools,
    turns,
    onText,
}: AnthropicMessagesCall): Promise<Anthropic.Message> {
    const isBearerAuth = connection.auth === "bearer"
    const client = new AnthropicWithoutLocalCredentials({
        baseURL: connection.baseUrl,
        apiKey: isBearerAuth ? null : (apiKey ?? null),
        authToken: isBearerAuth ? (apiKey ?? null) : null,
        ...(apiKey === undefined && { defaultHeaders: { "x-api-key": null } }),
    })
    try {
        return await client.messages
            .stream({
                model: apiId,
                max_tokens: maxTokens,
                system: systemPrompt,
                ...(tools.length > 0 && { tools }),
                messages: turns,
            })
            .on("text", onText)
            .finalMessage()
    } catch (error) {
        if (error instanceof Anthropic.APIError) {
            throw new UserError(
                `The anthropic-messages API at ${connection.baseUrl} failed: ${error.message}`,
            )
        }
        throw error
    }
}
