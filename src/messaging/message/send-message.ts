import { requireCompany } from "../../organization/company/require-company.ts"
import { loadExistingThread } from "../thread/load-existing-thread.ts"
import { createDraft } from "./create-draft.ts"
import { readCurrentAuthor } from "./read-current-author.ts"
import type { Message } from "./schema.ts"
import { sendDraft } from "./send-draft.ts"
import { listMessages } from "./storage.ts"

export type SendMessageResult = {
    message: Message
    unknownMentionIds: string[]
}

export async function sendMessage(
    projectRoot: string,
    rawThreadId: string,
    { body, asPositionId }: { body: string; asPositionId?: string },
): Promise<SendMessageResult> {
    await requireCompany(projectRoot)
    const thread = await loadExistingThread(projectRoot, rawThreadId)
    const messages = await listMessages(projectRoot, thread.id)
    const author = await readCurrentAuthor(projectRoot, {
        archive: { thread, messages },
        asPositionId,
    })
    const draft = await createDraft(projectRoot, author, body)
    return {
        message: await sendDraft(projectRoot, thread.id, draft),
        unknownMentionIds: draft.unknownMentionIds,
    }
}
