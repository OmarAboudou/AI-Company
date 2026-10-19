import { createMessageId } from "./create-message-id.ts"
import { getNextSentAt } from "./get-next-sent-at.ts"
import type { Draft, Message } from "./schema.ts"
import { listMessages, saveMessage } from "./storage.ts"

export async function sendDraft(
    projectRoot: string,
    threadId: string,
    { unknownMentionIds, ...draft }: Draft,
): Promise<Message> {
    const messages = await listMessages(projectRoot, threadId)
    const sentAt = getNextSentAt(messages, new Date())
    const message = { threadId, id: createMessageId(sentAt), ...draft, sentAt }
    await saveMessage(projectRoot, message)
    return message
}
