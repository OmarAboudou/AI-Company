import type Anthropic from "@anthropic-ai/sdk"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import { isAuthorOf } from "../../ids/is-author-of.ts"
import { formatTaggedMessage } from "../../messaging/message/format-tagged-message.ts"
import type { Message } from "../../messaging/message/schema.ts"

export type Replays = ReadonlyMap<string, Anthropic.ContentBlockParam[]>

export function getAnthropicTurns(
    messages: Message[],
    employee: IdHistory,
    replays: Replays,
): Anthropic.MessageParam[] {
    const turns: {
        role: "user" | "assistant"
        content: Anthropic.ContentBlockParam[]
    }[] = []
    for (const [index, message] of messages.entries()) {
        const isOwnMessage = isAuthorOf(employee, message)
        const role = isOwnMessage ? "assistant" : "user"
        const content: Anthropic.ContentBlockParam[] = isOwnMessage
            ? (replays.get(message.id) ?? [
                  { type: "text", text: message.body },
              ])
            : [{ type: "text", text: formatTaggedMessage(message, index + 1) }]
        const lastTurn = turns.at(-1)
        if (lastTurn?.role === role) {
            lastTurn.content.push(...content)
        } else {
            turns.push({ role, content })
        }
    }
    return turns
}
