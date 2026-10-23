import type { Command } from "@commander-js/extra-typings"
import { updateLlmProviderId } from "../../../llm/provider/update-llm-provider-id.ts"
import {
    formatIdArgumentDescription,
    formatNewIdArgumentDescription,
} from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"

export function registerProviderUpdateIdCommand(
    providerCommand: Command,
): void {
    providerCommand
        .command("update-id")
        .description(
            "Change the id of an LLM provider and of the employees running on it.",
        )
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<new-provider-id>",
            formatNewIdArgumentDescription("provider", "anthropic-api"),
        )
        .action(async (rawId, rawNewId) => {
            const { provider, renamedProvider, updatedEmployeeIds } =
                await updateLlmProviderId(projectRoot, rawId, rawNewId)
            const renamedMessage = `Provider "${provider.id}" is now "${renamedProvider.id}"`
            console.log(
                updatedEmployeeIds.length === 0
                    ? `${renamedMessage}.`
                    : `${renamedMessage}; updated employees: ${updatedEmployeeIds.join(", ")}.`,
            )
        })
}
