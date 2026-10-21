import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { getNextSentAt } from "./get-next-sent-at.ts"
import {
    type Message,
    messageSentEventType,
    type UnsentMessage,
} from "./schema.ts"
import { listMessages, saveMessage } from "./storage.ts"

export async function sendUnsentMessage(
    journal: Journal,
    threadId: string,
    { unknownMentionIds, ...messageContent }: UnsentMessage,
    { depth, runId }: { depth: number; runId?: string },
): Promise<Message> {
    const { projectRoot } = journal
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
    await recordEvent(journal, messageSentEventType, {
        depth,
        threadId,
        messageId: message.id,
        positionId: message.position.id,
        mentions: message.mentions,
        ...(runId !== undefined && { runId }),
    })
    await saveMessage(projectRoot, message)
    return message
}
