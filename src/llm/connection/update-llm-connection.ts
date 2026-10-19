import { getDefinedValues } from "../../get-defined-values.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import type { LlmProvider } from "../provider/schema.ts"
import { loadLlmProviderWithConnection } from "./load-llm-provider-with-connection.ts"
import { requireAnthropicForAuth } from "./require-anthropic-for-auth.ts"
import { saveLlmConnections } from "./save-llm-connections.ts"
import type { Protocol } from "./schema.ts"

export async function updateLlmConnection(
    projectRoot: string,
    rawProviderId: string,
    protocol: Protocol,
    changes: { baseUrl?: string; auth?: string },
): Promise<LlmProvider> {
    await requireCompany(projectRoot)
    const provider = await loadLlmProviderWithConnection(
        projectRoot,
        rawProviderId,
        protocol,
    )
    requireAnthropicForAuth(protocol, changes.auth)
    return saveLlmConnections(projectRoot, provider, {
        ...provider.connections,
        [protocol]: {
            ...provider.connections?.[protocol],
            ...getDefinedValues(changes),
        },
    })
}
