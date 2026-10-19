import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Message } from "../message/schema.ts"
import { getExchanges } from "./get-exchanges.ts"
import { getMemberIds } from "./get-member-ids.ts"
import type { Thread } from "./schema.ts"

export function getAwaitedIds(
    thread: Thread,
    messages: Message[],
    positions: IdHistory[],
): string[] {
    const answeredIds = new Set<string>()
    const awaitedIds = new Set<string>()
    const newestFirstExchanges = getExchanges(messages, positions).toReversed()
    for (const { authorId, mentionIds } of newestFirstExchanges) {
        for (const id of mentionIds) {
            if (!answeredIds.has(id)) {
                awaitedIds.add(id)
            }
        }
        answeredIds.add(authorId)
    }
    return getMemberIds(thread, messages, positions).filter((id) =>
        awaitedIds.has(id),
    )
}
