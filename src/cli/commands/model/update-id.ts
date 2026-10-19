import type { Command } from "@commander-js/extra-typings"
import { updateLlmModelId } from "../../../llm/model/update-llm-model-id.ts"
import {
    formatIdArgumentDescription,
    formatNewIdArgumentDescription,
} from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"

export function registerModelUpdateIdCommand(modelCommand: Command): void {
    modelCommand
        .command("update-id")
        .description(
            "Change the id of a model and of the employees running on it.",
        )
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .argument(
            "<new-model-id>",
            formatNewIdArgumentDescription("model", "opus"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, rawModelId, rawNewId) => {
            const { model, renamedModel, updatedEmployeeIds } =
                await updateLlmModelId(
                    projectRoot,
                    rawProviderId,
                    rawModelId,
                    rawNewId,
                )
            const renamedMessage = `Model "${model.id}" of provider "${model.providerId}" is now "${renamedModel.id}"`
            console.log(
                updatedEmployeeIds.length === 0
                    ? `${renamedMessage}.`
                    : `${renamedMessage}; updated employees: ${updatedEmployeeIds.join(", ")}.`,
            )
        })
}
