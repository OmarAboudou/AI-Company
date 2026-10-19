import { z } from "zod"
import { getDefinedValues } from "../../get-defined-values.ts"
import { parseId } from "../../ids/parse-id.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
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
    { name, apiKey }: { name: string; apiKey?: ApiKeySource },
): Promise<LlmProvider> {
    await requireCompany(projectRoot)
    const id = parseId("provider", rawId)
    if (await hasLlmProvider(projectRoot, id)) {
        throw new UserError(`Provider "${id}" already exists.`)
    }
    const validation = LlmProviderConfigSchema.safeParse({
        name,
        ...getDefinedValues({ apiKey }),
    })
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    const provider = { id, ...validation.data }
    await saveLlmProvider(projectRoot, provider)
    return provider
}
