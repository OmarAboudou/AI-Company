import { Argument, type Command, Option } from "@commander-js/extra-typings"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { printColumns } from "../cli/print-columns.ts"
import { projectRoot } from "../cli/project-root.ts"
import { requireAtLeastOneOption } from "../cli/require-at-least-one-option.ts"
import { requireDirector } from "../cli/require-director.ts"
import { createLlmConnection } from "../llm/connection/create-llm-connection.ts"
import { deleteLlmConnection } from "../llm/connection/delete-llm-connection.ts"
import {
    authSchemes,
    type Connection,
    type Protocol,
    protocols,
} from "../llm/connection/schema.ts"
import { updateLlmConnection } from "../llm/connection/update-llm-connection.ts"
import { listLlmProviders } from "../llm/provider/storage.ts"
import { requireCompany } from "../organization/company/require-company.ts"

function protocolArgument() {
    return new Argument(
        "<protocol>",
        `API protocol: ${protocols.join(", ")}`,
    ).choices(protocols)
}

function authOption() {
    return new Option(
        "-a, --auth <auth>",
        "how anthropic-messages sends the API key: x-api-key (the default) or bearer, an Authorization: Bearer header",
    ).choices(authSchemes)
}

function sentAuth(protocol: Protocol, connection: Connection): string {
    if (protocol !== "anthropic-messages") {
        return "bearer"
    }
    return ("auth" in connection ? connection.auth : undefined) ?? "x-api-key"
}

export function registerLlmConnectionCommands(providerCommand: Command): void {
    const connectionCommand = providerCommand
        .command("connection")
        .description(
            "Manage how providers are reached: one connection per API protocol.",
        )

    connectionCommand
        .command("create")
        .description("Create a provider's connection through an API protocol.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .addArgument(protocolArgument())
        .requiredOption(
            "-u, --base-url <url>",
            "URL the protocol's paths are appended to, e.g. https://api.anthropic.com",
        )
        .addOption(authOption())
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, protocol, { baseUrl, auth }) => {
            const provider = await createLlmConnection(
                projectRoot,
                rawProviderId,
                protocol,
                { baseUrl, auth },
            )
            console.log(
                `Created the ${protocol} connection of provider "${provider.id}".`,
            )
        })

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

    connectionCommand
        .command("update")
        .description("Update a connection: only the options given change.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .addArgument(protocolArgument())
        .option(
            "-u, --base-url <url>",
            "URL the protocol's paths are appended to, e.g. https://api.anthropic.com",
        )
        .addOption(authOption())
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, protocol, options) => {
            requireAtLeastOneOption(options)
            const provider = await updateLlmConnection(
                projectRoot,
                rawProviderId,
                protocol,
                { baseUrl: options.baseUrl, auth: options.auth },
            )
            console.log(
                `Updated the ${protocol} connection of provider "${provider.id}".`,
            )
        })

    connectionCommand
        .command("delete")
        .description("Delete a provider's connection no model is called with.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .addArgument(protocolArgument())
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, protocol) => {
            const provider = await deleteLlmConnection(
                projectRoot,
                rawProviderId,
                protocol,
            )
            console.log(
                `Deleted the ${protocol} connection of provider "${provider.id}".`,
            )
        })
}
