import type { Command } from "@commander-js/extra-typings"
import { deleteLlmProvider } from "../../../llm/provider/delete-llm-provider.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"

export function registerProviderDeleteCommand(providerCommand: Command): void {
    providerCommand
        .command("delete")
        .description(
            "Delete an LLM provider no employee runs on, and with --force its models.",
        )
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .option("-f, --force", "delete it even if it has models, deleting them")
        .hook("preAction", requireDirector)
        .action(async (rawId, { force: shouldForce }) => {
            const { provider, deletedModelIds } = await deleteLlmProvider(
                projectRoot,
                rawId,
                { shouldForce },
            )
            console.log(
                deletedModelIds.length === 0
                    ? `Deleted provider "${provider.id}".`
                    : `Deleted provider "${provider.id}" and its models ${deletedModelIds.join(", ")}.`,
            )
        })
}
