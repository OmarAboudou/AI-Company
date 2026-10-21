import type { Command } from "@commander-js/extra-typings"
import { updateLlmModel } from "../../../llm/model/update-llm-model.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { requireDirector } from "../../require-director.ts"
import { createApiIdOption } from "./create-api-id-option.ts"
import { createProtocolOption } from "./create-protocol-option.ts"

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
        .addOption(createApiIdOption())
        .addOption(createProtocolOption())
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
