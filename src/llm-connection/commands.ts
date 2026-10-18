import { Argument, type Command, Option } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    idDescription,
    loadExistingLlmProvider,
    printColumns,
    projectRoot,
    requireAnOption,
    requireCompany,
    withoutUndefined,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import {
    type LlmProvider,
    LlmProviderConfigSchema,
} from "../llm-provider/llm-provider.ts"
import { listLlmProviders, saveLlmProvider } from "../llm-provider/storage.ts"
import {
    authSchemes,
    type Connection,
    type Protocol,
    protocols,
} from "./llm-connection.ts"

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

function requireAnthropicForAuth(
    protocol: Protocol,
    auth: string | undefined,
): void {
    if (auth !== undefined && protocol !== "anthropic-messages") {
        throw new UserError(
            "--auth only applies to anthropic-messages: the OpenAI protocols always send a bearer token.",
        )
    }
}

function sentAuth(protocol: Protocol, connection: Connection): string {
    if (protocol !== "anthropic-messages") {
        return "bearer"
    }
    return ("auth" in connection ? connection.auth : undefined) ?? "x-api-key"
}

async function saveConnections(
    { id, ...current }: LlmProvider,
    connections: object,
): Promise<void> {
    const config = LlmProviderConfigSchema.safeParse({
        ...current,
        connections,
    })
    if (!config.success) {
        throw new UserError(z.prettifyError(config.error))
    }
    await saveLlmProvider(projectRoot, { id, ...config.data })
}

async function loadProviderWithConnection(
    rawProviderId: string,
    protocol: Protocol,
): Promise<LlmProvider> {
    const provider = await loadExistingLlmProvider(rawProviderId)
    if (provider.connections?.[protocol] === undefined) {
        throw new UserError(
            `Provider "${provider.id}" has no ${protocol} connection. Run \`llmco connection list\`.`,
        )
    }
    return provider
}

export function registerLlmConnectionCommands(program: Command): void {
    const connectionCommand = program
        .command("connection")
        .description(
            "Manage how LLM providers are reached: one connection per API protocol.",
        )

    connectionCommand
        .command("create")
        .description("Create a provider's connection through an API protocol.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .addArgument(protocolArgument())
        .requiredOption(
            "-u, --base-url <url>",
            "URL the protocol's paths are appended to, e.g. https://api.anthropic.com",
        )
        .addOption(authOption())
        .action(async (rawProviderId, protocol, { baseUrl, auth }) => {
            await requireCompany()
            const provider = await loadExistingLlmProvider(rawProviderId)
            if (provider.connections?.[protocol] !== undefined) {
                throw new UserError(
                    `Provider "${provider.id}" already has a connection through ${protocol}.`,
                )
            }
            requireAnthropicForAuth(protocol, auth)
            await saveConnections(provider, {
                ...provider.connections,
                [protocol]: { baseUrl, ...withoutUndefined({ auth }) },
            })
            console.log(
                `Created the ${protocol} connection of provider "${provider.id}".`,
            )
        })

    connectionCommand
        .command("list")
        .description("List the connections of every LLM provider.")
        .action(async () => {
            await requireCompany()
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
                    "No connections yet. Run `llmco connection create`.",
                )
                return
            }
            printColumns(rows)
        })

    connectionCommand
        .command("update")
        .description("Update a connection: only the options given change.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .addArgument(protocolArgument())
        .option(
            "-u, --base-url <url>",
            "URL the protocol's paths are appended to, e.g. https://api.anthropic.com",
        )
        .addOption(authOption())
        .action(async (rawProviderId, protocol, options) => {
            requireAnOption(options)
            await requireCompany()
            const provider = await loadProviderWithConnection(
                rawProviderId,
                protocol,
            )
            requireAnthropicForAuth(protocol, options.auth)
            await saveConnections(provider, {
                ...provider.connections,
                [protocol]: {
                    ...provider.connections?.[protocol],
                    ...withoutUndefined(options),
                },
            })
            console.log(
                `Updated the ${protocol} connection of provider "${provider.id}".`,
            )
        })

    connectionCommand
        .command("delete")
        .description("Delete a provider's connection.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .addArgument(protocolArgument())
        .action(async (rawProviderId, protocol) => {
            await requireCompany()
            const provider = await loadProviderWithConnection(
                rawProviderId,
                protocol,
            )
            const remaining = Object.entries(provider.connections ?? {}).filter(
                ([name]) => name !== protocol,
            )
            await saveConnections(provider, Object.fromEntries(remaining))
            console.log(
                `Deleted the ${protocol} connection of provider "${provider.id}".`,
            )
        })
}
