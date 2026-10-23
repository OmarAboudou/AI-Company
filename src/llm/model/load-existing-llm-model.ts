import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingLlmProvider } from "../provider/load-existing-llm-provider.ts"
import type { LlmModel } from "./schema.ts"
import { hasLlmModel, loadLlmModel } from "./storage.ts"

export async function loadExistingLlmModel(
    projectRoot: string,
    rawProviderId: string,
    rawModelId: string,
): Promise<LlmModel> {
    const provider = await loadExistingLlmProvider(projectRoot, rawProviderId)
    const modelId = parseId("model", rawModelId)
    if (!(await hasLlmModel(projectRoot, provider.id, modelId))) {
        throw new UserError(
            `Provider "${provider.id}" has no model "${modelId}". Run \`aico model list\`.`,
        )
    }
    return loadLlmModel(projectRoot, provider.id, modelId)
}
