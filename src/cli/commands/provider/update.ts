import type { Command } from "@commander-js/extra-typings"
import { updateLlmProvider } from "../../../llm/provider/update-llm-provider.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { requireDirector } from "../../require-director.ts"
import { apiKeyEnvOption } from "./api-key-env-option.ts"
import { apiKeyFileOption } from "./api-key-file-option.ts"
import { apiKeySource } from "./api-key-source.ts"

export function registerProviderUpdateCommand(providerCommand: Command): void {
    providerCommand
        .command("update")
        .description("Update an LLM provider: only the options given change.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .option("-n, --name <name>", "provider name")
        .addOption(apiKeyEnvOption())
        .addOption(apiKeyFileOption())
        .hook("preAction", requireDirector)
        .action(async (rawId, options) => {
            requireAtLeastOneOption(options)
            const provider = await updateLlmProvider(projectRoot, rawId, {
                name: options.name,
                apiKey: apiKeySource(options),
            })
            console.log(`Updated provider "${provider.id}".`)
        })
}
