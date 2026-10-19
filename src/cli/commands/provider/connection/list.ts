import type { Command } from "@commander-js/extra-typings"
import {
    type Connection,
    type Protocol,
    protocols,
} from "../../../../llm/connection/schema.ts"
import { listLlmProviders } from "../../../../llm/provider/storage.ts"
import { requireCompany } from "../../../../organization/company/require-company.ts"
import { printColumns } from "../../../print-columns.ts"
import { projectRoot } from "../../../project-root.ts"

function sentAuth(protocol: Protocol, connection: Connection): string {
    if (protocol !== "anthropic-messages") {
        return "bearer"
    }
    return ("auth" in connection ? connection.auth : undefined) ?? "x-api-key"
}

export function registerProviderConnectionListCommand(
    connectionCommand: Command,
): void {
    connectionCommand
        .command("list")
        .description("List the connections of every LLM provider.")
        .action(async () => {
            await requireCompany(projectRoot)
            const providers = await listLlmProviders(projectRoot)
            const rows = providers.flatMap(({ id, connections }) =>
                protocols.flatMap((protocol) => {
                    const connection = connections?.[protocol]
                    if (connection === undefined) {
                        return []
                    }
                    return [
                        [
                            `${id}/${protocol}`,
                            connection.baseUrl,
                            sentAuth(protocol, connection),
                        ],
                    ]
                }),
            )
            if (rows.length === 0) {
                console.log(
                    "No connections yet. Run `llmco provider connection create`.",
                )
                return
            }
            printColumns(rows)
        })
}
