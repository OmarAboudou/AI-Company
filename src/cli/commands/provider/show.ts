import type { Command } from "@commander-js/extra-typings"
import { protocols } from "../../../llm/connection/schema.ts"
import { loadExistingLlmProvider } from "../../../llm/provider/load-existing-llm-provider.ts"
import type { ApiKeySource } from "../../../llm/provider/schema.ts"
import { listLlmModels } from "../../../llm-model/storage.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"

function describeApiKey(apiKey: ApiKeySource | undefined): string {
    if (apiKey === undefined) {
        return "(none)"
    }
    return apiKey.kind === "env"
        ? `environment variable ${apiKey.variable}`
        : `file ${apiKey.path}`
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
            const modelIds =
                models.length > 0
                    ? models.map(({ id }) => id).join(", ")
                    : "(none)"
            const connections = protocols.filter(
                (protocol) => provider.connections?.[protocol] !== undefined,
            )
            const lines = [
                `# ${provider.name}`,
                "",
                `api key: ${describeApiKey(provider.apiKey)}`,
                `connections: ${connections.length > 0 ? connections.join(", ") : "(none)"}`,
                `models: ${modelIds}`,
            ]
            console.log(lines.join("\n"))
        })
}
