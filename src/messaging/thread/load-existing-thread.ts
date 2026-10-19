import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import type { Thread } from "./schema.ts"
import { hasThread, loadThread } from "./storage.ts"

export async function loadExistingThread(
    projectRoot: string,
    rawId: string,
): Promise<Thread> {
    const id = parseId("thread", rawId)
    if (!(await hasThread(projectRoot, id))) {
        throw new UserError(`No thread "${id}". Run \`llmco thread list\`.`)
    }
    return loadThread(projectRoot, id)
}
