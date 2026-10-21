import { loadJournal } from "../../journal/storage.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { builtInListeners } from "../../work/listener/built-in-listeners.ts"
import { dispatchEvents } from "../../work/listener/dispatch-events.ts"
import type { Task } from "../../work/task/schema.ts"
import { loadExistingThread } from "../thread/load-existing-thread.ts"
import { createUnsentMessage } from "./create-unsent-message.ts"
import { readCurrentAuthor } from "./read-current-author.ts"
import type { Message } from "./schema.ts"
import { sendUnsentMessage } from "./send-unsent-message.ts"
import { listMessages } from "./storage.ts"

export type SendMessageResult = {
    message: Message
    unknownMentionIds: string[]
    createdTasks: Task[]
}

export async function sendMessage(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    rawThreadId: string,
    { body, asPositionId }: { body: string; asPositionId?: string },
): Promise<SendMessageResult> {
    await requireCompany(projectRoot)
    const thread = await loadExistingThread(projectRoot, rawThreadId)
    const threadMessages = await listMessages(projectRoot, thread.id)
    const author = await readCurrentAuthor(projectRoot, environment, {
        archive: { thread, messages: threadMessages },
        asPositionId,
    })
    const [unsentMessage, journal] = await Promise.all([
        createUnsentMessage(projectRoot, author, body),
        loadJournal(projectRoot),
    ])
    const message = await sendUnsentMessage(journal, thread.id, unsentMessage, {
        depth: 0,
    })
    const { createdTasks } = await dispatchEvents(journal, builtInListeners)
    return {
        message,
        unknownMentionIds: unsentMessage.unknownMentionIds,
        createdTasks,
    }
}
