import type { Command } from "@commander-js/extra-typings"
import { updateLlmConnection } from "../../../../llm/connection/update-llm-connection.ts"
import { formatIdArgumentDescription } from "../../../id-argument-descriptions.ts"
import { projectRoot } from "../../../project-root.ts"
import { requireAtLeastOneOption } from "../../../require-at-least-one-option.ts"
import { runCommandOperation } from "../../../run-command-operation.ts"
import { createAuthOption } from "./create-auth-option.ts"
import { createBaseUrlOption } from "./create-base-url-option.ts"
import { createProtocolArgument } from "./create-protocol-argument.ts"

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
        .addArgument(createProtocolArgument())
        .addOption(createBaseUrlOption())
        .addOption(createAuthOption())
        .action(async (rawProviderId, protocol, options, command) => {
            requireAtLeastOneOption(options)
            const provider = await runCommandOperation(command, () =>
                updateLlmConnection(projectRoot, rawProviderId, protocol, {
                    baseUrl: options.baseUrl,
                    auth: options.auth,
                }),
            )
            console.log(
                `Updated the ${protocol} connection of provider "${provider.id}".`,
            )
        })
}
