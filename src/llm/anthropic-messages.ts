import type Anthropic from "@anthropic-ai/sdk"
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
