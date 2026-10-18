import Anthropic from "@anthropic-ai/sdk"
import { UserError } from "../errors.ts"
import type { Connections } from "../llm-connection/llm-connection.ts"
import type { Message } from "../message/message.ts"
import { authorName, minutes } from "../message/signature.ts"

export type Replays = ReadonlyMap<string, Anthropic.ContentBlockParam[]>

function attribute(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
}

function delimited(message: Message): string {
    const { position } = message
    const from = attribute(authorName(message))
    const as = attribute(`${position.title} (@${position.id})`)
    const sent = minutes(message.sentAt)
    return [
        `<message from="${from}" position="${as}" sent="${sent}">`,
        message.body.trimEnd(),
        "</message>",
    ].join("\n")
}

export function anthropicTurns(
    messages: Message[],
    employeeId: string,
    replays: Replays,
): Anthropic.MessageParam[] {
    const turns: {
        role: "user" | "assistant"
        content: Anthropic.ContentBlockParam[]
    }[] = []
    for (const message of messages) {
        const own = message.employee?.id === employeeId
        const role = own ? "assistant" : "user"
        const content: Anthropic.ContentBlockParam[] = own
            ? (replays.get(message.id) ?? [
                  { type: "text", text: message.body },
              ])
            : [{ type: "text", text: delimited(message) }]
        const last = turns.at(-1)
        if (last?.role === role) {
            last.content.push(...content)
        } else {
            turns.push({ role, content })
        }
    }
    return turns
}

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
    system: string
    messages: Anthropic.MessageParam[]
    onText: (text: string) => void
}

export async function callAnthropicMessages({
    connection,
    apiKey,
    apiId,
    system,
    messages,
    onText,
}: AnthropicMessagesCall): Promise<Anthropic.Message> {
    const bearer = connection.auth === "bearer"
    const client = new AnthropicWithoutLocalCredentials({
        baseURL: connection.baseUrl,
        apiKey: bearer ? null : (apiKey ?? null),
        authToken: bearer ? (apiKey ?? null) : null,
        ...(apiKey === undefined && { defaultHeaders: { "x-api-key": null } }),
    })
    try {
        return await client.messages
            .stream({ model: apiId, max_tokens: maxTokens, system, messages })
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
