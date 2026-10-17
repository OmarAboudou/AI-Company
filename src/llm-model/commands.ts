import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    idDescription,
    loadExistingLlmModel,
    loadExistingLlmProvider,
    parseId,
    printColumns,
    projectRoot,
    requireCompany,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import { listLlmProviders } from "../llm-provider/storage.ts"
import { LlmModelConfigSchema } from "./llm-model.ts"
import { listLlmModels, llmModelExists, saveLlmModel } from "./storage.ts"

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
                provider: provider.id,
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
                models.map(({ provider, id, name }) => [
                    `${provider}/${id}`,
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
                `# ${model.name}\n\nprovider: ${model.provider}\napi id: ${model.apiId}`,
            )
        })
}
