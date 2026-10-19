import type { Command } from "@commander-js/extra-typings"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"
import { apiKeyEnvOption } from "./api-key-env-option.ts"
import { apiKeyFileOption } from "./api-key-file-option.ts"
import { apiKeySource } from "./api-key-source.ts"

export function registerProviderCreateCommand(providerCommand: Command): void {
    providerCommand
        .command("create")
        .description("Create an LLM provider.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .requiredOption("-n, --name <name>", "provider name")
        .addOption(apiKeyEnvOption())
        .addOption(apiKeyFileOption())
        .hook("preAction", requireDirector)
        .action(async (rawId, { name, ...apiKeyOptions }) => {
            const provider = await createLlmProvider(projectRoot, rawId, {
                name,
                apiKey: apiKeySource(apiKeyOptions),
            })
            console.log(`Created provider "${provider.id}".`)
        })
}
