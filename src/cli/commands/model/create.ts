import type { Command } from "@commander-js/extra-typings"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"
import { protocolOption } from "./protocol-option.ts"

export function registerModelCreateCommand(modelCommand: Command): void {
    modelCommand
        .command("create")
        .description("Create a model served by an LLM provider.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .requiredOption("-n, --name <name>", "model name")
        .requiredOption(
            "-a, --api-id <api-id>",
            "id of the model on the provider's side, as its API expects it, e.g. claude-opus-5-5 or llama3.1:8b",
        )
        .addOption(protocolOption())
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, rawModelId, options) => {
            const model = await createLlmModel(
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
                `Created model "${model.id}" of provider "${model.providerId}".`,
            )
        })
}
