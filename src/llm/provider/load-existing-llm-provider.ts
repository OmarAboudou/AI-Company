import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import type { LlmProvider } from "./schema.ts"
import { hasLlmProvider, loadLlmProvider } from "./storage.ts"

export async function loadExistingLlmProvider(
    projectRoot: string,
    rawId: string,
): Promise<LlmProvider> {
    const id = parseId("provider", rawId)
    if (!(await hasLlmProvider(projectRoot, id))) {
        throw new UserError(`No provider "${id}". Run \`llmco provider list\`.`)
    }
    return loadLlmProvider(projectRoot, id)
}
