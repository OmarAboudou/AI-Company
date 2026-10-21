import { loadExistingLlmProvider } from "../provider/load-existing-llm-provider.ts"
import type { LlmProvider } from "../provider/schema.ts"
import { requireLlmConnection } from "./require-llm-connection.ts"
import type { Protocol } from "./schema.ts"

export async function loadLlmProviderWithConnection(
    projectRoot: string,
    rawProviderId: string,
    protocol: Protocol,
): Promise<LlmProvider> {
    const provider = await loadExistingLlmProvider(projectRoot, rawProviderId)
    requireLlmConnection(provider, protocol)
    return provider
}
