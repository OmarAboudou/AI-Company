import { getDefinedValues } from "../../get-defined-values.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { parseConfig } from "../../parse-config.ts"
import type { Protocol } from "../connection/schema.ts"
import { loadLlmProvider } from "../provider/storage.ts"
import { loadExistingLlmModel } from "./load-existing-llm-model.ts"
import { requireProviderConnection } from "./require-provider-connection.ts"
import { type LlmModel, LlmModelConfigSchema } from "./schema.ts"
import { saveLlmModel } from "./storage.ts"

export async function updateLlmModel(
    projectRoot: string,
    rawProviderId: string,
    rawModelId: string,
    changes: { name?: string; apiId?: string; protocol?: Protocol },
): Promise<LlmModel> {
    await requireCompany(projectRoot)
    const { providerId, id, ...config } = await loadExistingLlmModel(
        projectRoot,
        rawProviderId,
        rawModelId,
    )
    if (changes.protocol !== undefined) {
        const provider = await loadLlmProvider(projectRoot, providerId)
        requireProviderConnection(provider, changes.protocol)
    }
    const updatedConfig = parseConfig(LlmModelConfigSchema, {
        ...config,
        ...getDefinedValues(changes),
    })
    const updatedModel = { providerId, id, ...updatedConfig }
    await saveLlmModel(projectRoot, updatedModel)
    return updatedModel
}
