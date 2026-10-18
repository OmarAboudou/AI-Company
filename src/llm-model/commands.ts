import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    idDescription,
    loadExistingLlmModel,
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
import { listLlmProviders } from "../llm-provider/storage.ts"
import { LlmModelConfigSchema } from "./llm-model.ts"
import {
    copyLlmModel,
    deleteLlmModel,
    listLlmModels,
    llmModelExists,
    saveLlmModel,
} from "./storage.ts"

export function registerLlmModelCommands(program: Command): void {
    const modelCommand = program
        .command("model")
        .description("Manage the models served by the LLM providers.")

    modelCommand
        .command("create")
        .description("Create a model served by an LLM provider.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .argument("<model-id>", idDescription("model", "claude-opus-5-5"))
        .requiredOption("-n, --name <name>", "model name")
        .requiredOption(
            "-a, --api-id <api-id>",
            "id of the model on the provider's side, as its API expects it, e.g. claude-opus-5-5 or llama3.1:8b",
        )
        .action(async (rawProviderId, rawModelId, { name, apiId }) => {
            await requireCompany()
            const provider = await loadExistingLlmProvider(rawProviderId)
            const modelId = parseId("model", rawModelId)
            if (await llmModelExists(projectRoot, provider.id, modelId)) {
                throw new UserError(
                    `Provider "${provider.id}" already has a model "${modelId}".`,
                )
            }
            const config = LlmModelConfigSchema.safeParse({ name, apiId })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            await saveLlmModel(projectRoot, {
                providerId: provider.id,
                id: modelId,
                ...config.data,
            })
            console.log(
                `Created model "${modelId}" of provider "${provider.id}".`,
            )
        })

    modelCommand
        .command("list")
        .description("List the models of every LLM provider.")
        .action(async () => {
            await requireCompany()
            const providers = await listLlmProviders(projectRoot)
            const modelsByProvider = await Promise.all(
                providers.map(({ id }) => listLlmModels(projectRoot, id)),
            )
            const models = modelsByProvider.flat()
            if (models.length === 0) {
                console.log("No models yet. Run `llmco model create`.")
                return
            }
            printColumns(
                models.map(({ providerId, id, name }) => [
                    `${providerId}/${id}`,
                    name,
                ]),
            )
        })

    modelCommand
        .command("show")
        .description("Display a model and its id on the provider's side.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .argument("<model-id>", idDescription("model", "claude-opus-5-5"))
        .action(async (rawProviderId, rawModelId) => {
            await requireCompany()
            const model = await loadExistingLlmModel(rawProviderId, rawModelId)
            console.log(
                `# ${model.name}\n\nprovider: ${model.providerId}\napi id: ${model.apiId}`,
            )
        })

    modelCommand
        .command("update")
        .description("Update a model: only the options given change.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .argument("<model-id>", idDescription("model", "claude-opus-5-5"))
        .option("-n, --name <name>", "model name")
        .option(
            "-a, --api-id <api-id>",
            "id of the model on the provider's side, as its API expects it, e.g. claude-opus-5-5 or llama3.1:8b",
        )
        .action(async (rawProviderId, rawModelId, options) => {
            requireAnOption(options)
            await requireCompany()
            const { providerId, id, ...current } = await loadExistingLlmModel(
                rawProviderId,
                rawModelId,
            )
            const config = LlmModelConfigSchema.safeParse({
                ...current,
                ...withoutUndefined({
                    name: options.name,
                    apiId: options.apiId,
                }),
            })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            await saveLlmModel(projectRoot, { providerId, id, ...config.data })
            console.log(`Updated model "${id}" of provider "${providerId}".`)
        })

    modelCommand
        .command("update-id")
        .description(
            "Change the id of a model and of the employees running on it.",
        )
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .argument("<model-id>", idDescription("model", "claude-opus-5-5"))
        .argument("<new-model-id>", newIdDescription("model", "opus"))
        .action(async (rawProviderId, rawModelId, rawNewId) => {
            await requireCompany()
            const [model, employees] = await Promise.all([
                loadExistingLlmModel(rawProviderId, rawModelId),
                listEmployees(projectRoot),
            ])
            const newId = parseId("model", rawNewId)
            if (await llmModelExists(projectRoot, model.providerId, newId)) {
                throw new UserError(
                    `Provider "${model.providerId}" already has a model "${newId}".`,
                )
            }
            const users = employees
                .filter((employee) => employee.kind === "llm")
                .filter(
                    (employee) =>
                        employee.providerId === model.providerId &&
                        employee.modelId === model.id,
                )
            await copyLlmModel(projectRoot, model.providerId, model.id, newId)
            await Promise.all(
                users.map((employee) =>
                    saveEmployee(projectRoot, { ...employee, modelId: newId }),
                ),
            )
            await deleteLlmModel(projectRoot, model.providerId, model.id)
            const renamed = `Model "${model.id}" of provider "${model.providerId}" is now "${newId}"`
            console.log(
                users.length === 0
                    ? `${renamed}.`
                    : `${renamed}; updated employees: ${users.map(({ id }) => id).join(", ")}.`,
            )
        })

    modelCommand
        .command("delete")
        .description("Delete a model no employee runs on.")
        .argument("<provider-id>", idDescription("provider", "anthropic"))
        .argument("<model-id>", idDescription("model", "claude-opus-5-5"))
        .action(async (rawProviderId, rawModelId) => {
            await requireCompany()
            const [model, employees] = await Promise.all([
                loadExistingLlmModel(rawProviderId, rawModelId),
                listEmployees(projectRoot),
            ])
            const users = employees.filter(
                (employee) =>
                    employee.kind === "llm" &&
                    employee.providerId === model.providerId &&
                    employee.modelId === model.id,
            )
            if (users.length > 0) {
                throw new UserError(
                    `Model "${model.id}" of provider "${model.providerId}" is used by ${users.map(({ id }) => id).join(", ")}. Give these employees another model with \`llmco employee update\`, or delete them, first.`,
                )
            }
            await deleteLlmModel(projectRoot, model.providerId, model.id)
            console.log(
                `Deleted model "${model.id}" of provider "${model.providerId}".`,
            )
        })
}
