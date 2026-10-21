import { getDefinedValues } from "../../get-defined-values.ts"
import { parseId } from "../../ids/parse-id.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { parseConfig } from "../../parse-config.ts"
import { UserError } from "../../user-error.ts"
import {
    type ApiKeySource,
    type LlmProvider,
    LlmProviderConfigSchema,
} from "./schema.ts"
import { hasLlmProvider, saveLlmProvider } from "./storage.ts"

export async function createLlmProvider(
    projectRoot: string,
    rawId: string,
    { name, apiKeySource }: { name: string; apiKeySource?: ApiKeySource },
): Promise<LlmProvider> {
    await requireCompany(projectRoot)
    const id = parseId("provider", rawId)
    if (await hasLlmProvider(projectRoot, id)) {
        throw new UserError(`Provider "${id}" already exists.`)
    }
    const providerConfig = parseConfig(LlmProviderConfigSchema, {
        name,
        ...getDefinedValues({ apiKeySource }),
    })
    const provider = { id, ...providerConfig }
    await saveLlmProvider(projectRoot, provider)
    return provider
}
