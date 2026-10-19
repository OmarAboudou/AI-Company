import type { Command } from "@commander-js/extra-typings"
import { createLlmConnection } from "../../../../llm/connection/create-llm-connection.ts"
import { formatIdArgumentDescription } from "../../../format-id-argument-description.ts"
import { projectRoot } from "../../../project-root.ts"
import { requireDirector } from "../../../require-director.ts"
import { createAuthOption } from "./create-auth-option.ts"
import { createProtocolArgument } from "./create-protocol-argument.ts"

export function registerProviderConnectionCreateCommand(
    connectionCommand: Command,
): void {
    connectionCommand
        .command("create")
        .description("Create a provider's connection through an API protocol.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .addArgument(createProtocolArgument())
        .requiredOption(
            "-u, --base-url <url>",
            "URL the protocol's paths are appended to, e.g. https://api.anthropic.com",
        )
        .addOption(createAuthOption())
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
}
