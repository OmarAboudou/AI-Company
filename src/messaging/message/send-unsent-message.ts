import { createMessageId } from "./create-message-id.ts"
import { getNextSentAt } from "./get-next-sent-at.ts"
import type { Message, UnsentMessage } from "./schema.ts"
import { listMessages, saveMessage } from "./storage.ts"

export async function sendUnsentMessage(
    projectRoot: string,
    threadId: string,
    { unknownMentionIds, ...messageContent }: UnsentMessage,
): Promise<Message> {
    const messages = await listMessages(projectRoot, threadId)
    const sentAt = getNextSentAt(messages, new Date())
    const message = {
        threadId,
        id: createMessageId(sentAt),
        ...messageContent,
        sentAt,
    }
    await saveMessage(projectRoot, message)
    return message
}
