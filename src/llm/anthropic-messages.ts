import type Anthropic from "@anthropic-ai/sdk"
import type { Message } from "../message/message.ts"
import { minutes, signature } from "../message/signature.ts"

export type Replays = ReadonlyMap<string, Anthropic.ContentBlockParam[]>

function header(message: Message): string {
    return `From: ${signature(message)}, ${minutes(message.sentAt)}`
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
            : [{ type: "text", text: `${header(message)}\n\n${message.body}` }]
        const last = turns.at(-1)
        if (last?.role === role) {
            last.content.push(...content)
        } else {
            turns.push({ role, content })
        }
    }
    return turns
}
