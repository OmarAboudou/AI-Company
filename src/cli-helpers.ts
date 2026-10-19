import { projectRoot } from "./cli/project-root.ts"
import { parseId } from "./ids/parse-id.ts"
import type { Thread } from "./messaging/thread/schema.ts"
import { loadThread, threadExists } from "./messaging/thread/storage.ts"
import { UserError } from "./user-error.ts"

export async function loadExistingThread(rawId: string): Promise<Thread> {
    const id = parseId("thread", rawId)
    if (!(await threadExists(projectRoot, id))) {
        throw new UserError(`No thread "${id}". Run \`llmco thread list\`.`)
    }
    return loadThread(projectRoot, id)
}
