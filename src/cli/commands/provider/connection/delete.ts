import type { Command } from "@commander-js/extra-typings"
import { deleteLlmConnection } from "../../../../llm/connection/delete-llm-connection.ts"
import { formatIdArgumentDescription } from "../../../id-argument-descriptions.ts"
import { projectRoot } from "../../../project-root.ts"
import { runCommandOperation } from "../../../run-command-operation.ts"
import { createProtocolArgument } from "./create-protocol-argument.ts"

export function registerProviderConnectionDeleteCommand(
    connectionCommand: Command,
): void {
    connectionCommand
        .command("delete")
        .description("Delete a provider's connection no model is called with.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .addArgument(createProtocolArgument())
        .action(async (rawProviderId, protocol, _options, command) => {
            const provider = await runCommandOperation(command, () =>
                deleteLlmConnection(projectRoot, rawProviderId, protocol),
            )
            console.log(
                `Deleted the ${protocol} connection of provider "${provider.id}".`,
            )
        })
}
