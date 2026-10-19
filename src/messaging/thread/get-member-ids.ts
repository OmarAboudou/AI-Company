import { getCurrentId } from "../../ids/get-current-id.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Message } from "../../message/message.ts"
import { exchanges } from "./get-exchanges.ts"
import type { Thread } from "./schema.ts"

function creatorId(thread: Thread, positions: IdHistory[]): string {
    const { createdBy, createdAt } = thread
    return getCurrentId(positions, createdBy.position.id, createdAt)
}

export function memberIds(
    thread: Thread,
    messages: Message[],
    positions: IdHistory[],
): string[] {
    const ids = [creatorId(thread, positions)]
    for (const { authorId, mentionIds } of exchanges(messages, positions)) {
        for (const id of [authorId, ...mentionIds]) {
            if (!ids.includes(id)) {
                ids.push(id)
            }
        }
    }
    return ids
}
