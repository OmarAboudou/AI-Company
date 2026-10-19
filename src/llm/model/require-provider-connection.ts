import { UserError } from "../../user-error.ts"
import type { Protocol } from "../connection/schema.ts"
import type { LlmProvider } from "../provider/schema.ts"

export function requireProviderConnection(
    provider: LlmProvider,
    protocol: Protocol,
): void {
    if (provider.connections?.[protocol] === undefined) {
        throw new UserError(
            `Provider "${provider.id}" has no ${protocol} connection. Run \`llmco provider connection create\` first.`,
        )
    }
}
