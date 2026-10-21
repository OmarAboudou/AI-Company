import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { messageSentEventType } from "../../journal/schema.ts"
import { getNextSentAt } from "./get-next-sent-at.ts"
import type { Message, UnsentMessage } from "./schema.ts"
import { listMessages, saveMessage } from "./storage.ts"

export async function sendUnsentMessage(
    projectRoot: string,
    threadId: string,
    { unknownMentionIds, ...messageContent }: UnsentMessage,
    { depth }: { depth: number },
): Promise<Message> {
    const threadMessages = await listMessages(projectRoot, threadId)
    const sentAt = getNextSentAt(threadMessages, new Date())
    const message = {
        threadId,
        id: createTimeOrderedId(sentAt),
        ...messageContent,
        sentAt,
    }
    // The event comes first: should the sending stop between the two, an
    // event naming no message asks for nothing new, whereas a message
    // without its event would mention positions that are never asked.
    await recordEvent(projectRoot, messageSentEventType, {
        depth,
        threadId,
        messageId: message.id,
        mentions: message.mentions,
    })
    await saveMessage(projectRoot, message)
    return message
}
