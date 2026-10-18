import type { Message } from "../message/message.ts"
import type { Thread } from "./thread.ts"

export function memberIds(thread: Thread, messages: Message[]): string[] {
    const ids = [thread.createdBy.position.id]
    for (const { position, mentions } of messages) {
        for (const id of [position.id, ...mentions]) {
            if (!ids.includes(id)) {
                ids.push(id)
            }
        }
    }
    return ids
}

export function awaitedIds(thread: Thread, messages: Message[]): string[] {
    const answered = new Set<string>()
    const awaited = new Set<string>()
    for (const { position, mentions } of messages.toReversed()) {
        for (const id of mentions) {
            if (!answered.has(id)) {
                awaited.add(id)
            }
        }
        answered.add(position.id)
    }
    return memberIds(thread, messages).filter((id) => awaited.has(id))
}
