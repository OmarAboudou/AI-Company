import { projectRoot } from "../../cli/project-root.ts"
import { newMessageId } from "./create-message-id.ts"
import { nextSentAt } from "./get-next-sent-at.ts"
import type { Draft } from "./schema.ts"
import { listMessages, saveMessage } from "./storage.ts"

export async function sendDraft(
    threadId: string,
    { unknownMentions, ...draft }: Draft,
): Promise<string> {
    const messages = await listMessages(projectRoot, threadId)
    const sentAt = nextSentAt(messages, new Date())
    const id = newMessageId(sentAt)
    await saveMessage(projectRoot, { threadId, id, ...draft, sentAt })
    for (const positionId of unknownMentions) {
        console.error(
            `"@${positionId}" names no position, so it mentions nobody.`,
        )
    }
    return id
}
