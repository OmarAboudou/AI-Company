import type { Command } from "@commander-js/extra-typings"
import { listLlmModels } from "../../../llm/model/storage.ts"
import { listLlmProviders } from "../../../llm/provider/storage.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { printColumns } from "../../print-columns.ts"
import { projectRoot } from "../../project-root.ts"

export function registerModelListCommand(modelCommand: Command): void {
    modelCommand
        .command("list")
        .description("List the models of every LLM provider.")
        .action(async () => {
            await requireCompany(projectRoot)
            const providers = await listLlmProviders(projectRoot)
            const modelsByProvider = await Promise.all(
                providers.map(({ id }) => listLlmModels(projectRoot, id)),
            )
            const models = modelsByProvider.flat()
            if (models.length === 0) {
                console.log("No models yet. Run `llmco model create`.")
                return
            }
            printColumns(
                models.map(({ providerId, id, name }) => [
                    `${providerId}/${id}`,
                    name,
                ]),
            )
        })
}
