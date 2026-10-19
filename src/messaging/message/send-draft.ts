import { createMessageId } from "./create-message-id.ts"
import { getNextSentAt } from "./get-next-sent-at.ts"
import type { Draft } from "./schema.ts"
import { listMessages, saveMessage } from "./storage.ts"

export async function sendDraft(
    projectRoot: string,
    threadId: string,
    { unknownMentionIds, ...draft }: Draft,
): Promise<string> {
    const messages = await listMessages(projectRoot, threadId)
    const sentAt = getNextSentAt(messages, new Date())
    const id = createMessageId(sentAt)
    await saveMessage(projectRoot, { threadId, id, ...draft, sentAt })
    for (const positionId of unknownMentionIds) {
        console.error(
            `"@${positionId}" names no position, so it mentions nobody.`,
        )
    }
    return id
}
