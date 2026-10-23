import type { Command } from "@commander-js/extra-typings"
import { listLlmProviders } from "../../../llm/provider/storage.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { printColumns } from "../../print-columns.ts"
import { projectRoot } from "../../project-root.ts"

export function registerProviderListCommand(providerCommand: Command): void {
    providerCommand
        .command("list")
        .description("List the LLM providers.")
        .action(async () => {
            await requireCompany(projectRoot)
            const providers = await listLlmProviders(projectRoot)
            if (providers.length === 0) {
                console.log("No providers yet. Run `aico provider create`.")
                return
            }
            printColumns(providers.map(({ id, name }) => [id, name]))
        })
}
