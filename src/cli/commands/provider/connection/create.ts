import type { Command } from "@commander-js/extra-typings"
import { createLlmConnection } from "../../../../llm/connection/create-llm-connection.ts"
import { formatIdArgumentDescription } from "../../../id-argument-descriptions.ts"
import { projectRoot } from "../../../project-root.ts"
import { createAuthOption } from "./create-auth-option.ts"
import { createBaseUrlOption } from "./create-base-url-option.ts"
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
        .addOption(createBaseUrlOption().makeOptionMandatory())
        .addOption(createAuthOption())
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
