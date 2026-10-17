import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    idDescription,
    loadExistingLlmProvider,
    parseId,
    printColumns,
    projectRoot,
    requireCompany,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import { listLlmModels } from "../llm-model/storage.ts"
import { LlmProviderConfigSchema } from "./llm-provider.ts"
import {
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
}
