import { getCurrentId } from "../../ids/get-current-id.ts"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Message } from "../message/schema.ts"

export type Exchange = { authorId: string; mentionIds: string[] }

export function getExchanges(
    messages: Message[],
    positions: IdHistory[],
): Exchange[] {
    return messages.map(({ position, mentions, sentAt }) => ({
        authorId: getCurrentId(positions, position.id, sentAt),
        mentionIds: mentions.map((id) => getCurrentId(positions, id, sentAt)),
    }))
}
