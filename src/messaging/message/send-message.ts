import { requireCompany } from "../../organization/company/require-company.ts"
import { builtInListeners } from "../../work/listener/built-in-listeners.ts"
import { dispatchEvents } from "../../work/listener/dispatch-events.ts"
import type { Task } from "../../work/task/schema.ts"
import { markCatchUpsAsDone } from "../../work/task-type/built-in/catch-up-thread/mark-catch-ups-as-done.ts"
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
    rawThreadId: string,
    { body, asPositionId }: { body: string; asPositionId?: string },
): Promise<SendMessageResult> {
    await requireCompany(projectRoot)
    const thread = await loadExistingThread(projectRoot, rawThreadId)
    const threadMessages = await listMessages(projectRoot, thread.id)
    const author = await readCurrentAuthor(projectRoot, {
        archive: { thread, messages: threadMessages },
        asPositionId,
    })
    const unsentMessage = await createUnsentMessage(projectRoot, author, body)
    // The catch-ups that earlier messages ask of the author must exist for
    // this message to mark them as done.
    await dispatchEvents(projectRoot, builtInListeners)
    const message = await sendUnsentMessage(
        projectRoot,
        thread.id,
        unsentMessage,
        { depth: 0 },
    )
    await markCatchUpsAsDone(projectRoot, {
        positionId: author.position.id,
        message,
    })
    const { createdTasks } = await dispatchEvents(projectRoot, builtInListeners)
    return {
        message,
        unknownMentionIds: unsentMessage.unknownMentionIds,
        createdTasks,
    }
}
