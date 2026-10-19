import { type Command, Option } from "@commander-js/extra-typings"
import { z } from "zod"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { formatNewIdArgumentDescription } from "../cli/format-new-id-argument-description.ts"
import { printColumns } from "../cli/print-columns.ts"
import { projectRoot } from "../cli/project-root.ts"
import { requireAtLeastOneOption } from "../cli/require-at-least-one-option.ts"
import { requireDirector } from "../cli/require-director.ts"
import { loadExistingLlmProvider, withoutUndefined } from "../cli-helpers.ts"
import { requireCompany } from "../company/require-company.ts"
import { parseId } from "../ids/parse-id.ts"
import { registerLlmConnectionCommands } from "../llm-connection/commands.ts"
import { protocols } from "../llm-connection/llm-connection.ts"
import { listLlmModels } from "../llm-model/storage.ts"
import {
    listEmployees,
    saveEmployee,
} from "../organization/employee/storage.ts"
import { UserError } from "../user-error.ts"
import { type ApiKeySource, LlmProviderConfigSchema } from "./llm-provider.ts"
import {
    copyLlmProvider,
    deleteLlmProvider,
    listLlmProviders,
    llmProviderExists,
    saveLlmProvider,
} from "./storage.ts"

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
            await requireCompany(projectRoot)
            const id = parseId("provider", rawId)
            if (await llmProviderExists(projectRoot, id)) {
                throw new UserError(`Provider "${id}" already exists.`)
            }
            const config = LlmProviderConfigSchema.safeParse({
                name,
                ...withoutUndefined({ apiKey: apiKeySource(apiKeyOptions) }),
            })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            await saveLlmProvider(projectRoot, { id, ...config.data })
            console.log(`Created provider "${id}".`)
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
            const provider = await loadExistingLlmProvider(rawId)
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
            await requireCompany(projectRoot)
            const { id, ...current } = await loadExistingLlmProvider(rawId)
            const config = LlmProviderConfigSchema.safeParse({
                ...current,
                ...withoutUndefined({
                    name: options.name,
                    apiKey: apiKeySource(options),
                }),
            })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            await saveLlmProvider(projectRoot, { id, ...config.data })
            console.log(`Updated provider "${id}".`)
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
            await requireCompany(projectRoot)
            const newId = parseId("provider", rawNewId)
            const [provider, taken, employees] = await Promise.all([
                loadExistingLlmProvider(rawId),
                llmProviderExists(projectRoot, newId),
                listEmployees(projectRoot),
            ])
            if (taken) {
                throw new UserError(`Provider "${newId}" already exists.`)
            }
            const users = employees
                .filter((employee) => employee.kind === "llm")
                .filter((employee) => employee.providerId === provider.id)
            // Copy, repoint, then delete rather than move, as for employees:
            // an employee must never run on a missing provider.
            await copyLlmProvider(projectRoot, provider.id, newId)
            await Promise.all(
                users.map((employee) =>
                    saveEmployee(projectRoot, {
                        ...employee,
                        providerId: newId,
                    }),
                ),
            )
            await deleteLlmProvider(projectRoot, provider.id)
            const renamed = `Provider "${provider.id}" is now "${newId}"`
            console.log(
                users.length === 0
                    ? `${renamed}.`
                    : `${renamed}; updated employees: ${users.map(({ id }) => id).join(", ")}.`,
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
        .action(async (rawId, { force }) => {
            await requireCompany(projectRoot)
            const provider = await loadExistingLlmProvider(rawId)
            const [models, employees] = await Promise.all([
                listLlmModels(projectRoot, provider.id),
                listEmployees(projectRoot),
            ])
            const users = employees.filter(
                (employee) =>
                    employee.kind === "llm" &&
                    employee.providerId === provider.id,
            )
            if (users.length > 0) {
                throw new UserError(
                    `Provider "${provider.id}" is used by ${users.map(({ id }) => id).join(", ")}. Give these employees another model with \`llmco employee update\`, or delete them, first; --force doesn't change that.`,
                )
            }
            const modelIds = models.map(({ id }) => id).join(", ")
            if (models.length > 0 && !force) {
                throw new UserError(
                    `Provider "${provider.id}" has models ${modelIds}. Add --force to delete them with it.`,
                )
            }
            await deleteLlmProvider(projectRoot, provider.id)
            console.log(
                models.length === 0
                    ? `Deleted provider "${provider.id}".`
                    : `Deleted provider "${provider.id}" and its models ${modelIds}.`,
            )
        })

    registerLlmConnectionCommands(providerCommand)
}
