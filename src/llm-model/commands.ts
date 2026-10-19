import { type Command, Option } from "@commander-js/extra-typings"
import { z } from "zod"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { formatNewIdArgumentDescription } from "../cli/format-new-id-argument-description.ts"
import { printColumns } from "../cli/print-columns.ts"
import { projectRoot } from "../cli/project-root.ts"
import { requireAtLeastOneOption } from "../cli/require-at-least-one-option.ts"
import { requireDirector } from "../cli/require-director.ts"
import { getDefinedValues } from "../get-defined-values.ts"
import { parseId } from "../ids/parse-id.ts"
import { protocols } from "../llm/connection/schema.ts"
import { createLlmModel } from "../llm/model/create-llm-model.ts"
import { loadExistingLlmModel } from "../llm/model/load-existing-llm-model.ts"
import { requireProviderConnection } from "../llm/model/require-provider-connection.ts"
import { LlmModelConfigSchema } from "../llm/model/schema.ts"
import {
    copyLlmModelFolder,
    deleteLlmModelFolder,
    hasLlmModel,
    listLlmModels,
    saveLlmModel,
} from "../llm/model/storage.ts"
import { listLlmProviders, loadLlmProvider } from "../llm/provider/storage.ts"
import { requireCompany } from "../organization/company/require-company.ts"
import {
    listEmployees,
    saveEmployee,
} from "../organization/employee/storage.ts"
import { UserError } from "../user-error.ts"

function protocolOption() {
    return new Option(
        "-p, --protocol <protocol>",
        "API protocol the model is called with, one of its provider's connections (see llmco provider connection list)",
    ).choices(protocols)
}

export function registerLlmModelCommands(program: Command): void {
    const modelCommand = program
        .command("model")
        .description("Manage the models served by the LLM providers.")

    modelCommand
        .command("create")
        .description("Create a model served by an LLM provider.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .requiredOption("-n, --name <name>", "model name")
        .requiredOption(
            "-a, --api-id <api-id>",
            "id of the model on the provider's side, as its API expects it, e.g. claude-opus-5-5 or llama3.1:8b",
        )
        .addOption(protocolOption())
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, rawModelId, options) => {
            const model = await createLlmModel(
                projectRoot,
                rawProviderId,
                rawModelId,
                {
                    name: options.name,
                    apiId: options.apiId,
                    protocol: options.protocol,
                },
            )
            console.log(
                `Created model "${model.id}" of provider "${model.providerId}".`,
            )
        })

    modelCommand
        .command("list")
        .description("List the models of every LLM provider.")
        .action(async () => {
            await requireCompany(projectRoot)
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
        .description(
            "Display a model, its id on the provider's side and its protocol.",
        )
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .action(async (rawProviderId, rawModelId) => {
            await requireCompany(projectRoot)
            const model = await loadExistingLlmModel(
                projectRoot,
                rawProviderId,
                rawModelId,
            )
            console.log(
                `# ${model.name}\n\nprovider: ${model.providerId}\napi id: ${model.apiId}\nprotocol: ${model.protocol}`,
            )
        })

    modelCommand
        .command("update")
        .description("Update a model: only the options given change.")
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .option("-n, --name <name>", "model name")
        .option(
            "-a, --api-id <api-id>",
            "id of the model on the provider's side, as its API expects it, e.g. claude-opus-5-5 or llama3.1:8b",
        )
        .addOption(protocolOption())
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, rawModelId, options) => {
            requireAtLeastOneOption(options)
            await requireCompany(projectRoot)
            const { providerId, id, ...current } = await loadExistingLlmModel(
                projectRoot,
                rawProviderId,
                rawModelId,
            )
            if (options.protocol !== undefined) {
                const provider = await loadLlmProvider(projectRoot, providerId)
                requireProviderConnection(provider, options.protocol)
            }
            const config = LlmModelConfigSchema.safeParse({
                ...current,
                ...getDefinedValues(options),
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
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .argument(
            "<new-model-id>",
            formatNewIdArgumentDescription("model", "opus"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, rawModelId, rawNewId) => {
            await requireCompany(projectRoot)
            const [model, employees] = await Promise.all([
                loadExistingLlmModel(projectRoot, rawProviderId, rawModelId),
                listEmployees(projectRoot),
            ])
            const newId = parseId("model", rawNewId)
            if (await hasLlmModel(projectRoot, model.providerId, newId)) {
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
            // Copy, repoint, then delete rather than move, as for employees:
            // an employee must never run on a missing model.
            await copyLlmModelFolder(
                projectRoot,
                model.providerId,
                model.id,
                newId,
            )
            await Promise.all(
                users.map((employee) =>
                    saveEmployee(projectRoot, { ...employee, modelId: newId }),
                ),
            )
            await deleteLlmModelFolder(projectRoot, model.providerId, model.id)
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
        .argument(
            "<provider-id>",
            formatIdArgumentDescription("provider", "anthropic"),
        )
        .argument(
            "<model-id>",
            formatIdArgumentDescription("model", "claude-opus-5-5"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawProviderId, rawModelId) => {
            await requireCompany(projectRoot)
            const [model, employees] = await Promise.all([
                loadExistingLlmModel(projectRoot, rawProviderId, rawModelId),
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
            await deleteLlmModelFolder(projectRoot, model.providerId, model.id)
            console.log(
                `Deleted model "${model.id}" of provider "${model.providerId}".`,
            )
        })
}
