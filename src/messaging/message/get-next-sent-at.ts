import type { Message } from "./schema.ts"

export function getNextSentAt(messages: Message[], now: Date): string {
    const lastMessage = messages.at(-1)
    const earliestTime =
        lastMessage === undefined ? 0 : Date.parse(lastMessage.sentAt) + 1
    return new Date(Math.max(now.getTime(), earliestTime)).toISOString()
}
