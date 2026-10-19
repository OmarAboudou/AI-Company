import { getCurrentId } from "../../ids/get-current-id.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Message } from "../message/schema.ts"
import { getExchanges } from "./get-exchanges.ts"
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
    for (const { authorId, mentionIds } of getExchanges(messages, positions)) {
        for (const id of [authorId, ...mentionIds]) {
            if (!memberIds.includes(id)) {
                memberIds.push(id)
            }
        }
    }
    return memberIds
}
