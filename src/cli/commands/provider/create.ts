import type { Command } from "@commander-js/extra-typings"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"
import { createApiKeyEnvOption } from "./create-api-key-env-option.ts"
import { createApiKeyFileOption } from "./create-api-key-file-option.ts"
import { getApiKeySource } from "./get-api-key-source.ts"

export function registerProviderCreateCommand(providerCommand: Command): void {
    providerCommand
        .command("create")
        .description("Create an LLM provider.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .requiredOption("-n, --name <name>", "provider name")
        .addOption(createApiKeyEnvOption())
        .addOption(createApiKeyFileOption())
        .hook("preAction", requireDirector)
        .action(async (rawId, { name, ...apiKeyOptions }) => {
            const provider = await createLlmProvider(projectRoot, rawId, {
                name,
                apiKeySource: getApiKeySource(apiKeyOptions),
            })
            console.log(`Created provider "${provider.id}".`)
        })
}
