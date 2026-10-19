import type { Command } from "@commander-js/extra-typings"
import { deleteLlmModel } from "../../../llm/model/delete-llm-model.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"

export function registerModelDeleteCommand(modelCommand: Command): void {
    modelCommand
        .command("delete")
        .description("Delete a model no employee runs on.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, rawModelId) => {
            const model = await deleteLlmModel(
                projectRoot,
                rawProviderId,
                rawModelId,
            )
            console.log(
                `Deleted model "${model.id}" of provider "${model.providerId}".`,
            )
        })
}
