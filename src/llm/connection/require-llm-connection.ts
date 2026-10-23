import { UserError } from "../../user-error.ts"
import type { LlmProvider } from "../provider/schema.ts"
import type { Connections, Protocol } from "./schema.ts"

export function requireLlmConnection<ConnectionProtocol extends Protocol>(
    provider: LlmProvider,
    protocol: ConnectionProtocol,
): NonNullable<Connections[ConnectionProtocol]> {
    const connection = provider.connections?.[protocol]
    if (connection === undefined) {
        throw new UserError(
            `Provider "${provider.id}" has no ${protocol} connection. Run \`aico provider connection list\` to see its connections, or \`aico provider connection create\` to add one.`,
        )
    }
    return connection
}
