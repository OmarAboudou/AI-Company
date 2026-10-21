import { loadJournal } from "../../journal/storage.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { parseConfig } from "../../parse-config.ts"
import { builtInListeners } from "../../work/listener/built-in-listeners.ts"
import { dispatchEvents } from "../../work/listener/dispatch-events.ts"
import type { Task } from "../../work/task/schema.ts"
import { createUnsentMessage } from "../message/create-unsent-message.ts"
import { readCurrentAuthor } from "../message/read-current-author.ts"
import type { Message } from "../message/schema.ts"
import { sendUnsentMessage } from "../message/send-unsent-message.ts"
import { createThreadId } from "./create-thread-id.ts"
import { type Thread, ThreadConfigSchema } from "./schema.ts"
import { saveThread } from "./storage.ts"

export type CreateThreadResult = {
    thread: Thread
    firstMessage: Message | undefined
    unknownMentionIds: string[]
    createdTasks: Task[]
}

export async function createThread(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    {
        subject,
        body,
        asPositionId,
    }: { subject: string; body?: string; asPositionId?: string },
): Promise<CreateThreadResult> {
    await requireCompany(projectRoot)
    const author = await readCurrentAuthor(projectRoot, environment, {
        asPositionId,
    })
    const unsentFirstMessage =
        body === undefined
            ? undefined
            : await createUnsentMessage(projectRoot, author, body)
    const createdAt = new Date().toISOString()
    const config = parseConfig(ThreadConfigSchema, {
        subject,
        createdAt,
        createdBy: author,
    })
    const thread = {
        id: await createThreadId(projectRoot, config.subject, createdAt),
        ...config,
    }
    await saveThread(projectRoot, thread)
    if (unsentFirstMessage === undefined) {
        return {
            thread,
            firstMessage: undefined,
            unknownMentionIds: [],
            createdTasks: [],
        }
    }
    const journal = await loadJournal(projectRoot)
    const firstMessage = await sendUnsentMessage(
        journal,
        thread.id,
        unsentFirstMessage,
        { depth: 0 },
    )
    const { createdTasks } = await dispatchEvents(journal, builtInListeners)
    return {
        thread,
        firstMessage,
        unknownMentionIds: unsentFirstMessage.unknownMentionIds,
        createdTasks,
    }
}
