import type { Command } from "@commander-js/extra-typings"
import { updateLlmProvider } from "../../../llm/provider/update-llm-provider.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { runCommandOperation } from "../../run-command-operation.ts"
import { createApiKeyEnvOption } from "./create-api-key-env-option.ts"
import { createApiKeyFileOption } from "./create-api-key-file-option.ts"
import { getApiKeySource } from "./get-api-key-source.ts"

export function registerProviderUpdateCommand(providerCommand: Command): void {
    providerCommand
        .command("update")
        .description("Update an LLM provider: only the options given change.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .option("-n, --name <name>", "provider name")
        .addOption(createApiKeyEnvOption())
        .addOption(createApiKeyFileOption())
        .action(async (rawId, options, command) => {
            requireAtLeastOneOption(options)
            const provider = await runCommandOperation(command, () =>
                updateLlmProvider(projectRoot, rawId, {
                    name: options.name,
                    apiKeySource: getApiKeySource(options),
                }),
            )
            console.log(`Updated provider "${provider.id}".`)
        })
}
