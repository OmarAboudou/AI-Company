import type { LlmProvider } from "../provider/schema.ts"
import { type Protocol, protocols } from "./schema.ts"

export function getConnectedProtocols(provider: LlmProvider): Protocol[] {
    return protocols.filter(
        (protocol) => provider.connections?.[protocol] !== undefined,
    )
}
