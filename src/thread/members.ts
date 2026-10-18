import { currentId, type IdHistory } from "../id-history.ts"
import type { Message } from "../message/message.ts"
import type { Thread } from "./thread.ts"

type Exchange = { authorId: string; mentionIds: string[] }

function exchanges(messages: Message[], positions: IdHistory[]): Exchange[] {
    return messages.map(({ position, mentions, sentAt }) => ({
        authorId: currentId(positions, position.id, sentAt),
        mentionIds: mentions.map((id) => currentId(positions, id, sentAt)),
    }))
}

function members(creatorId: string, exchanged: Exchange[]): string[] {
    const ids = [creatorId]
    for (const { authorId, mentionIds } of exchanged) {
        for (const id of [authorId, ...mentionIds]) {
            if (!ids.includes(id)) {
                ids.push(id)
            }
        }
    }
    return ids
}

function creatorId(thread: Thread, positions: IdHistory[]): string {
    const { createdBy, createdAt } = thread
    return currentId(positions, createdBy.position.id, createdAt)
}

export function memberIds(
    thread: Thread,
    messages: Message[],
    positions: IdHistory[],
): string[] {
    return members(creatorId(thread, positions), exchanges(messages, positions))
}

export function awaitedIds(
    thread: Thread,
    messages: Message[],
    positions: IdHistory[],
): string[] {
    const exchanged = exchanges(messages, positions)
    const answered = new Set<string>()
    const awaited = new Set<string>()
    for (const { authorId, mentionIds } of exchanged.toReversed()) {
        for (const id of mentionIds) {
            if (!answered.has(id)) {
                awaited.add(id)
            }
        }
        answered.add(authorId)
    }
    return members(creatorId(thread, positions), exchanged).filter((id) =>
        awaited.has(id),
    )
}
