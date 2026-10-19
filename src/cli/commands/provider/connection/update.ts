import type { Command } from "@commander-js/extra-typings"
import { updateLlmConnection } from "../../../../llm/connection/update-llm-connection.ts"
import { formatIdArgumentDescription } from "../../../format-id-argument-description.ts"
import { projectRoot } from "../../../project-root.ts"
import { requireAtLeastOneOption } from "../../../require-at-least-one-option.ts"
import { requireDirector } from "../../../require-director.ts"
import { authOption } from "./auth-option.ts"
import { protocolArgument } from "./protocol-argument.ts"

export function registerProviderConnectionUpdateCommand(
    connectionCommand: Command,
): void {
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
}
