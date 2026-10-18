import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    idDescription,
    loadExistingLlmProvider,
    parseId,
    printColumns,
    projectRoot,
    requireAnOption,
    requireCompany,
    withoutUndefined,
} from "../cli-helpers.ts"
import { listEmployees } from "../employee/storage.ts"
import { UserError } from "../errors.ts"
import { listLlmModels } from "../llm-model/storage.ts"
import { LlmProviderConfigSchema } from "./llm-provider.ts"
import {
    deleteLlmProvider,
    listLlmProviders,
    llmProviderExists,
    saveLlmProvider,
} from "./storage.ts"

export function registerLlmProviderCommands(program: Command): void {
    const providerCommand = program
        .command("provider")
        .description("Manage the LLM providers serving models to the company.")

    providerCommand
        .command("create")
        .description("Create an LLM provider.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .requiredOption("-n, --name <name>", "provider name")
        .action(async (rawId, { name }) => {
            await requireCompany()
            const id = parseId("provider", rawId)
            if (await llmProviderExists(projectRoot, id)) {
                throw new UserError(`Provider "${id}" already exists.`)
            }
            const config = LlmProviderConfigSchema.safeParse({ name })
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
        .description("Display an LLM provider and its models.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .action(async (rawId) => {
            await requireCompany()
            const provider = await loadExistingLlmProvider(rawId)
            const models = await listLlmModels(projectRoot, provider.id)
            const modelIds =
                models.length > 0
                    ? models.map(({ id }) => id).join(", ")
                    : "(none)"
            console.log(`# ${provider.name}\n\nmodels: ${modelIds}`)
        })

    providerCommand
        .command("update")
        .description("Update an LLM provider: only the options given change.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .option("-n, --name <name>", "provider name")
        .action(async (rawId, options) => {
            requireAnOption(options)
            await requireCompany()
            const { id, ...current } = await loadExistingLlmProvider(rawId)
            const config = LlmProviderConfigSchema.safeParse({
                ...current,
                ...withoutUndefined({ name: options.name }),
            })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            await saveLlmProvider(projectRoot, { id, ...config.data })
            console.log(`Updated provider "${id}".`)
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
