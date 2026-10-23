import { createTimeOrderedId } from "../../ids/create-time-ordered-id.ts"
import { recordEvent } from "../../journal/record-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { readMonotonicTime } from "../../read-monotonic-time.ts"
import { getNextSentAt } from "./get-next-sent-at.ts"
import {
    type Message,
    type MessageEventType,
    messageSentEventType,
    type UnsentMessage,
} from "./schema.ts"
import { listMessages, saveMessage } from "./storage.ts"

export async function sendUnsentMessage(
    journal: Journal,
    ticketNumber: number,
    unsentMessage: UnsentMessage,
    {
        depth,
        runId,
        eventType = messageSentEventType,
        eventFields,
    }: {
        depth: number
        runId?: string
        eventType?: MessageEventType
        eventFields?: object
    },
): Promise<Message> {
    const { projectRoot } = journal
    const ticketMessages = await listMessages(projectRoot, ticketNumber)
    const sentAt = getNextSentAt(ticketMessages, new Date(readMonotonicTime()))
    const message = {
        ticketNumber,
        id: createTimeOrderedId(sentAt),
        ...unsentMessage,
        sentAt,
    }
    // The event comes first: should the sending stop between the two, an
    // event naming no message asks for nothing new, whereas a message
    // without its event would never reach the listeners.
    await recordEvent(journal, eventType, {
        depth,
        ticketNumber,
        messageId: message.id,
        positionId: message.position.id,
        ...(runId !== undefined && { runId }),
        ...eventFields,
    })
    await saveMessage(projectRoot, message)
    return message
}
