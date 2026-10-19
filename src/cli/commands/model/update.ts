import type { Command } from "@commander-js/extra-typings"
import { updateLlmModel } from "../../../llm/model/update-llm-model.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { requireDirector } from "../../require-director.ts"
import { protocolOption } from "./protocol-option.ts"

export function registerModelUpdateCommand(modelCommand: Command): void {
    modelCommand
        .command("update")
        .description("Update a model: only the options given change.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .option("-n, --name <name>", "model name")
        .option(
            "-a, --api-id <api-id>",
            "id of the model on the provider's side, as its API expects it, e.g. claude-opus-5-5 or llama3.1:8b",
        )
        .addOption(protocolOption())
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, rawModelId, options) => {
            requireAtLeastOneOption(options)
            const model = await updateLlmModel(
                projectRoot,
                rawProviderId,
                rawModelId,
                {
                    name: options.name,
                    apiId: options.apiId,
                    protocol: options.protocol,
                },
            )
            console.log(
                `Updated model "${model.id}" of provider "${model.providerId}".`,
            )
        })
}
