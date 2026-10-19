import { type Command, Option } from "@commander-js/extra-typings"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { formatNewIdArgumentDescription } from "../cli/format-new-id-argument-description.ts"
import { printColumns } from "../cli/print-columns.ts"
import { projectRoot } from "../cli/project-root.ts"
import { requireAtLeastOneOption } from "../cli/require-at-least-one-option.ts"
import { requireDirector } from "../cli/require-director.ts"
import { protocols } from "../llm/connection/schema.ts"
import { createLlmProvider } from "../llm/provider/create-llm-provider.ts"
import { deleteLlmProvider } from "../llm/provider/delete-llm-provider.ts"
import { loadExistingLlmProvider } from "../llm/provider/load-existing-llm-provider.ts"
import type { ApiKeySource } from "../llm/provider/schema.ts"
import { listLlmProviders } from "../llm/provider/storage.ts"
import { updateLlmProvider } from "../llm/provider/update-llm-provider.ts"
import { updateLlmProviderId } from "../llm/provider/update-llm-provider-id.ts"
import { registerLlmConnectionCommands } from "../llm-connection/commands.ts"
import { listLlmModels } from "../llm-model/storage.ts"
import { requireCompany } from "../organization/company/require-company.ts"

function apiKeyEnvOption() {
    return new Option(
        "-e, --api-key-env <variable>",
        "read the API key from this environment variable, e.g. ANTHROPIC_API_KEY",
    )
}

function apiKeyFileOption() {
    return new Option(
        "-k, --api-key-file <path>",
        "read the API key from this file: absolute, starting with ~, or relative to the project's root",
    ).conflicts("apiKeyEnv")
}

function apiKeySource(options: {
    apiKeyEnv?: string
    apiKeyFile?: string
}): ApiKeySource | undefined {
    if (options.apiKeyEnv !== undefined) {
        return { kind: "env", variable: options.apiKeyEnv }
    }
    if (options.apiKeyFile !== undefined) {
        return { kind: "file", path: options.apiKeyFile }
    }
    return undefined
}

function describeApiKey(apiKey: ApiKeySource | undefined): string {
    if (apiKey === undefined) {
        return "(none)"
    }
    return apiKey.kind === "env"
        ? `environment variable ${apiKey.variable}`
        : `file ${apiKey.path}`
}

export function registerLlmProviderCommands(program: Command): void {
    const providerCommand = program
        .command("provider")
        .description("Manage the LLM providers serving models to the company.")

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

    providerCommand
        .command("list")
        .description("List the LLM providers.")
        .action(async () => {
            await requireCompany(projectRoot)
            const providers = await listLlmProviders(projectRoot)
            if (providers.length === 0) {
                console.log("No providers yet. Run `llmco provider create`.")
                return
            }
            printColumns(providers.map(({ id, name }) => [id, name]))
        })

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

    providerCommand
        .command("update-id")
        .description(
            "Change the id of an LLM provider and of the employees running on it.",
        )
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<new-provider-id>",
            formatNewIdArgumentDescription("provider", "anthropic-api"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawId, rawNewId) => {
            const { provider, renamedProvider, updatedEmployeeIds } =
                await updateLlmProviderId(projectRoot, rawId, rawNewId)
            const renamedMessage = `Provider "${provider.id}" is now "${renamedProvider.id}"`
            console.log(
                updatedEmployeeIds.length === 0
                    ? `${renamedMessage}.`
                    : `${renamedMessage}; updated employees: ${updatedEmployeeIds.join(", ")}.`,
            )
        })

    providerCommand
        .command("delete")
        .description(
            "Delete an LLM provider no employee runs on, and with --force its models.",
        )
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .option("-f, --force", "delete it even if it has models, deleting them")
        .hook("preAction", requireDirector)
        .action(async (rawId, { force: shouldForce }) => {
            const { provider, deletedModelIds } = await deleteLlmProvider(
                projectRoot,
                rawId,
                { shouldForce },
            )
            console.log(
                deletedModelIds.length === 0
                    ? `Deleted provider "${provider.id}".`
                    : `Deleted provider "${provider.id}" and its models ${deletedModelIds.join(", ")}.`,
            )
        })

    registerLlmConnectionCommands(providerCommand)
}
