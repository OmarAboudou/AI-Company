import { UserError } from "../../user-error.ts"
import { loadExistingLlmProvider } from "../provider/load-existing-llm-provider.ts"
import type { LlmProvider } from "../provider/schema.ts"
import type { Protocol } from "./schema.ts"

export async function loadLlmProviderWithConnection(
    projectRoot: string,
    rawProviderId: string,
    protocol: Protocol,
): Promise<LlmProvider> {
    const provider = await loadExistingLlmProvider(projectRoot, rawProviderId)
    if (provider.connections?.[protocol] === undefined) {
        throw new UserError(
            `Provider "${provider.id}" has no ${protocol} connection. Run \`llmco provider connection list\`.`,
        )
    }
    return provider
}
