import type { Message } from "../../message/message.ts"
import { listMessages } from "../../message/storage.ts"
import type { Thread } from "./schema.ts"
import { listThreads } from "./storage.ts"

export type Archive = { thread: Thread; messages: Message[] }

export async function listArchives(projectRoot: string): Promise<Archive[]> {
    const threads = await listThreads(projectRoot)
    return Promise.all(
        threads.map(async (thread) => ({
            thread,
            messages: await listMessages(projectRoot, thread.id),
        })),
    )
}
