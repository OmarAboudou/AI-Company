import { getDefinedValues } from "../../get-defined-values.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { parseConfig } from "../../parse-config.ts"
import { loadExistingLlmProvider } from "./load-existing-llm-provider.ts"
import {
    type ApiKeySource,
    type LlmProvider,
    LlmProviderConfigSchema,
} from "./schema.ts"
import { saveLlmProvider } from "./storage.ts"

export async function updateLlmProvider(
    projectRoot: string,
    rawId: string,
    changes: { name?: string; apiKeySource?: ApiKeySource },
): Promise<LlmProvider> {
    await requireCompany(projectRoot)
    const { id, ...config } = await loadExistingLlmProvider(projectRoot, rawId)
    const updatedConfig = parseConfig(LlmProviderConfigSchema, {
        ...config,
        ...getDefinedValues(changes),
    })
    const updatedProvider = { id, ...updatedConfig }
    await saveLlmProvider(projectRoot, updatedProvider)
    return updatedProvider
}
