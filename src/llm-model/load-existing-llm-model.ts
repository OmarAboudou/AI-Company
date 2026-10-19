import { parseId } from "../ids/parse-id.ts"
import { loadExistingLlmProvider } from "../llm-provider/load-existing-llm-provider.ts"
import { UserError } from "../user-error.ts"
import type { LlmModel } from "./llm-model.ts"
import { llmModelExists, loadLlmModel } from "./storage.ts"

export async function loadExistingLlmModel(
    projectRoot: string,
    rawProviderId: string,
    rawModelId: string,
): Promise<LlmModel> {
    const provider = await loadExistingLlmProvider(projectRoot, rawProviderId)
    const modelId = parseId("model", rawModelId)
    if (!(await llmModelExists(projectRoot, provider.id, modelId))) {
        throw new UserError(
            `Provider "${provider.id}" has no model "${modelId}". Run \`llmco model list\`.`,
        )
    }
    return loadLlmModel(projectRoot, provider.id, modelId)
}
