import type { Message } from "./schema.ts"

export function nextSentAt(messages: Message[], now: Date): string {
    const last = messages.at(-1)
    const notBefore = last === undefined ? 0 : Date.parse(last.sentAt) + 1
    return new Date(Math.max(now.getTime(), notBefore)).toISOString()
}
