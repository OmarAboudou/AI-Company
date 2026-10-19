import { projectRoot } from "./cli/project-root.ts"
import { parseId } from "./ids/parse-id.ts"
import { loadThread, threadExists } from "./thread/storage.ts"
import type { Thread } from "./thread/thread.ts"
import { UserError } from "./user-error.ts"

export function withoutUndefined<Values extends object>(
    values: Values,
): Partial<Values> {
    return Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined),
    ) as Partial<Values>
}

export async function loadExistingThread(rawId: string): Promise<Thread> {
    const id = parseId("thread", rawId)
    if (!(await threadExists(projectRoot, id))) {
        throw new UserError(`No thread "${id}". Run \`llmco thread list\`.`)
    }
    return loadThread(projectRoot, id)
}
