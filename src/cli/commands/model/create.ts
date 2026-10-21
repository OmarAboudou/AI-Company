import type { Command } from "@commander-js/extra-typings"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"
import { createApiIdOption } from "./create-api-id-option.ts"
import { createProtocolOption } from "./create-protocol-option.ts"

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
        .addOption(createApiIdOption().makeOptionMandatory())
        .addOption(createProtocolOption())
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
