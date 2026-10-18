import { type Command, Option } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    idDescription,
    loadExistingLlmProvider,
    newIdDescription,
    parseId,
    printColumns,
    projectRoot,
    requireAnOption,
    requireCompany,
    withoutUndefined,
} from "../cli-helpers.ts"
import { listEmployees, saveEmployee } from "../employee/storage.ts"
import { UserError } from "../errors.ts"
import { listLlmModels } from "../llm-model/storage.ts"
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
        return { env: options.apiKeyEnv }
    }
    if (options.apiKeyFile !== undefined) {
        return { file: options.apiKeyFile }
    }
    return undefined
}

function describeApiKey(apiKey: ApiKeySource | undefined): string {
    if (apiKey === undefined) {
        return "(none)"
    }
    return "env" in apiKey
        ? `environment variable ${apiKey.env}`
        : `file ${apiKey.file}`
}

export function registerLlmProviderCommands(program: Command): void {
    const providerCommand = program
        .command("provider")
        .description("Manage the LLM providers serving models to the company.")

    providerCommand
        .command("create")
        .description("Create an LLM provider.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .requiredOption("-n, --name <name>", "provider name")
        .addOption(apiKeyEnvOption())
        .addOption(apiKeyFileOption())
        .action(async (rawId, { name, ...apiKeyOptions }) => {
            await requireCompany()
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
            await requireCompany()
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
            "Display an LLM provider, its API key's source and its models.",
        )
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .action(async (rawId) => {
            await requireCompany()
            const provider = await loadExistingLlmProvider(rawId)
            const models = await listLlmModels(projectRoot, provider.id)
            const modelIds =
                models.length > 0
                    ? models.map(({ id }) => id).join(", ")
                    : "(none)"
            console.log(
                `# ${provider.name}\n\napi key: ${describeApiKey(provider.apiKey)}\nmodels: ${modelIds}`,
            )
        })

    providerCommand
        .command("update")
        .description("Update an LLM provider: only the options given change.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .option("-n, --name <name>", "provider name")
        .addOption(apiKeyEnvOption())
        .addOption(apiKeyFileOption())
        .action(async (rawId, options) => {
            requireAnOption(options)
            await requireCompany()
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
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .argument(
            "<new-provider-id>",
            newIdDescription("provider", "anthropic-api"),
        )
        .action(async (rawId, rawNewId) => {
            await requireCompany()
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
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .option("-f, --force", "delete it even if it has models, deleting them")
        .action(async (rawId, { force }) => {
            await requireCompany()
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
}
