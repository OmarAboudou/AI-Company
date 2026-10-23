import type { Command } from "@commander-js/extra-typings"
import { deleteLlmModel } from "../../../llm/model/delete-llm-model.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

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
        .action(async (rawProviderId, rawModelId, _options, command) => {
            const model = await runCommandOperation(command, () =>
                deleteLlmModel(projectRoot, rawProviderId, rawModelId),
            )
            console.log(
                `Deleted model "${model.id}" of provider "${model.providerId}".`,
            )
        })
}
