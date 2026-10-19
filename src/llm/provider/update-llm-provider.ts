import { z } from "zod"
import { getDefinedValues } from "../../get-defined-values.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { UserError } from "../../user-error.ts"
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
    changes: { name?: string; apiKey?: ApiKeySource },
): Promise<LlmProvider> {
    await requireCompany(projectRoot)
    const { id, ...config } = await loadExistingLlmProvider(projectRoot, rawId)
    const validation = LlmProviderConfigSchema.safeParse({
        ...config,
        ...getDefinedValues(changes),
    })
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    const updatedProvider = { id, ...validation.data }
    await saveLlmProvider(projectRoot, updatedProvider)
    return updatedProvider
}
