import { getDefinedValues } from "../../get-defined-values.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingLlmProvider } from "../provider/load-existing-llm-provider.ts"
import type { LlmProvider } from "../provider/schema.ts"
import { requireAnthropicForAuth } from "./require-anthropic-for-auth.ts"
import { saveLlmConnections } from "./save-llm-connections.ts"
import type { Protocol } from "./schema.ts"

export async function createLlmConnection(
    projectRoot: string,
    rawProviderId: string,
    protocol: Protocol,
    { baseUrl, auth }: { baseUrl: string; auth?: string },
): Promise<LlmProvider> {
    await requireCompany(projectRoot)
    const provider = await loadExistingLlmProvider(projectRoot, rawProviderId)
    if (provider.connections?.[protocol] !== undefined) {
        throw new UserError(
            `Provider "${provider.id}" already has a connection through ${protocol}.`,
        )
    }
    requireAnthropicForAuth(protocol, auth)
    return saveLlmConnections(projectRoot, provider, {
        ...provider.connections,
        [protocol]: { baseUrl, ...getDefinedValues({ auth }) },
    })
}
