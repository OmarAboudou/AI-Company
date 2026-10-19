import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Message } from "../../message/message.ts"
import { exchanges } from "./get-exchanges.ts"
import { memberIds } from "./get-member-ids.ts"
import type { Thread } from "./schema.ts"

export function awaitedIds(
    thread: Thread,
    messages: Message[],
    positions: IdHistory[],
): string[] {
    const answered = new Set<string>()
    const awaited = new Set<string>()
    const newestFirst = exchanges(messages, positions).toReversed()
    for (const { authorId, mentionIds } of newestFirst) {
        for (const id of mentionIds) {
            if (!answered.has(id)) {
                awaited.add(id)
            }
        }
        answered.add(authorId)
    }
    return memberIds(thread, messages, positions).filter((id) =>
        awaited.has(id),
    )
}
