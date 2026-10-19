import type Anthropic from "@anthropic-ai/sdk"
import { formatDateTime } from "../../format-date-time.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import { isAuthorOf } from "../../ids/is-author-of.ts"
import { getAuthorName } from "../../messaging/message/get-author-name.ts"
import type { Message } from "../../messaging/message/schema.ts"

export type Replays = ReadonlyMap<string, Anthropic.ContentBlockParam[]>

function escapeAttribute(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
}

function formatTaggedMessage(message: Message): string {
    const { position } = message
    const escapedAuthorName = escapeAttribute(getAuthorName(message))
    const escapedPositionName = escapeAttribute(
        `${position.title} (@${position.id})`,
    )
    const sentMinute = formatDateTime(message.sentAt)
    return [
        `<message from="${escapedAuthorName}" position="${escapedPositionName}" sent="${sentMinute}">`,
        message.body.trimEnd(),
        "</message>",
    ].join("\n")
}

export function getAnthropicTurns(
    messages: Message[],
    employee: IdHistory,
    replays: Replays,
): Anthropic.MessageParam[] {
    const turns: {
        role: "user" | "assistant"
        content: Anthropic.ContentBlockParam[]
    }[] = []
    for (const message of messages) {
        const isOwnMessage = isAuthorOf(employee, message)
        const role = isOwnMessage ? "assistant" : "user"
        const content: Anthropic.ContentBlockParam[] = isOwnMessage
            ? (replays.get(message.id) ?? [
                  { type: "text", text: message.body },
              ])
            : [{ type: "text", text: formatTaggedMessage(message) }]
        const lastTurn = turns.at(-1)
        if (lastTurn?.role === role) {
            lastTurn.content.push(...content)
        } else {
            turns.push({ role, content })
        }
    }
    return turns
}
