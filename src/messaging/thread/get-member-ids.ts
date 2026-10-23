import { getCurrentId } from "../../ids/get-current-id.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Message } from "../message/schema.ts"
import type { Thread } from "./schema.ts"

function getCreatorId(thread: Thread, positions: IdHistory[]): string {
    const { createdBy, createdAt } = thread
    return getCurrentId(positions, createdBy.position.id, createdAt)
}

export function getMemberIds(
    thread: Thread,
    messages: Message[],
    positions: IdHistory[],
): string[] {
    const memberIds = [getCreatorId(thread, positions)]
    for (const { position, sentAt } of messages) {
        const authorId = getCurrentId(positions, position.id, sentAt)
        if (!memberIds.includes(authorId)) {
            memberIds.push(authorId)
        }
    }
    return memberIds
}
