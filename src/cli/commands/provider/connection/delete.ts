import type { Command } from "@commander-js/extra-typings"
import { deleteLlmConnection } from "../../../../llm/connection/delete-llm-connection.ts"
import { formatIdArgumentDescription } from "../../../format-id-argument-description.ts"
import { projectRoot } from "../../../project-root.ts"
import { requireDirector } from "../../../require-director.ts"
import { protocolArgument } from "./protocol-argument.ts"

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
