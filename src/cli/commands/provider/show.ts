import type { Command } from "@commander-js/extra-typings"
import { getConnectedProtocols } from "../../../llm/connection/get-connected-protocols.ts"
import { listLlmModels } from "../../../llm/model/storage.ts"
import { loadExistingLlmProvider } from "../../../llm/provider/load-existing-llm-provider.ts"
import type { ApiKeySource } from "../../../llm/provider/schema.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"

function formatApiKeySource(source: ApiKeySource | undefined): string {
    if (source === undefined) {
        return "(none)"
    }
    return source.kind === "env"
        ? `environment variable ${source.variable}`
        : `file ${source.path}`
}

export function registerProviderShowCommand(providerCommand: Command): void {
    providerCommand
        .command("show")
        .description(
            "Display an LLM provider: its API key's source, connections and models.",
        )
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .action(async (rawId) => {
            await requireCompany(projectRoot)
            const provider = await loadExistingLlmProvider(projectRoot, rawId)
            const models = await listLlmModels(projectRoot, provider.id)
            const modelIds = models.map(({ id }) => id)
            const connectedProtocols = getConnectedProtocols(provider)
            const lines = [
                `# ${provider.name}`,
                "",
                `api key: ${formatApiKeySource(provider.apiKeySource)}`,
                `connections: ${connectedProtocols.length > 0 ? connectedProtocols.join(", ") : "(none)"}`,
                `models: ${modelIds.length > 0 ? modelIds.join(", ") : "(none)"}`,
            ]
            console.log(lines.join("\n"))
        })
}
