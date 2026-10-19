import type { Command } from "@commander-js/extra-typings"
import { loadExistingLlmModel } from "../../../llm/model/load-existing-llm-model.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"

export function registerModelShowCommand(modelCommand: Command): void {
    modelCommand
        .command("show")
        .description(
            "Display a model, its id on the provider's side and its protocol.",
        )
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .action(async (rawProviderId, rawModelId) => {
            await requireCompany(projectRoot)
            const model = await loadExistingLlmModel(
                projectRoot,
                rawProviderId,
                rawModelId,
            )
            console.log(
                `# ${model.name}\n\nprovider: ${model.providerId}\napi id: ${model.apiId}\nprotocol: ${model.protocol}`,
            )
        })
}
