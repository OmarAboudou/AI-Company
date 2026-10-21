import { z } from "zod"
import { requireCompany } from "../../organization/company/require-company.ts"
import { UserError } from "../../user-error.ts"
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
    {
        subject,
        body,
        asPositionId,
    }: { subject: string; body?: string; asPositionId?: string },
): Promise<CreateThreadResult> {
    await requireCompany(projectRoot)
    const author = await readCurrentAuthor(projectRoot, { asPositionId })
    const unsentFirstMessage =
        body === undefined
            ? undefined
            : await createUnsentMessage(projectRoot, author, body)
    const createdAt = new Date().toISOString()
    const validation = ThreadConfigSchema.safeParse({
        subject,
        createdAt,
        createdBy: author,
    })
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    const thread = {
        id: await createThreadId(
            projectRoot,
            validation.data.subject,
            createdAt,
        ),
        ...validation.data,
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
    const firstMessage = await sendUnsentMessage(
        projectRoot,
        thread.id,
        unsentFirstMessage,
        { depth: 0 },
    )
    const { createdTasks } = await dispatchEvents(projectRoot, builtInListeners)
    return {
        thread,
        firstMessage,
        unknownMentionIds: unsentFirstMessage.unknownMentionIds,
        createdTasks,
    }
}
