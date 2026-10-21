import { parseId } from "../../ids/parse-id.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { parseConfig } from "../../parse-config.ts"
import { UserError } from "../../user-error.ts"
import { type Protocol, protocols } from "../connection/schema.ts"
import { loadExistingLlmProvider } from "../provider/load-existing-llm-provider.ts"
import type { LlmProvider } from "../provider/schema.ts"
import { requireProviderConnection } from "./require-provider-connection.ts"
import { type LlmModel, LlmModelConfigSchema } from "./schema.ts"
import { hasLlmModel, saveLlmModel } from "./storage.ts"

function chooseProtocol(
    provider: LlmProvider,
    requestedProtocol: Protocol | undefined,
): Protocol {
    if (requestedProtocol !== undefined) {
        requireProviderConnection(provider, requestedProtocol)
        return requestedProtocol
    }
    const connectedProtocols = protocols.filter(
        (protocol) => provider.connections?.[protocol] !== undefined,
    )
    const [onlyProtocol, ...otherProtocols] = connectedProtocols
    if (onlyProtocol === undefined) {
        throw new UserError(
            `Provider "${provider.id}" has no connection yet. Run \`llmco provider connection create\` first.`,
        )
    }
    if (otherProtocols.length > 0) {
        throw new UserError(
            `Provider "${provider.id}" has several connections (${connectedProtocols.join(", ")}): choose one with --protocol.`,
        )
    }
    return onlyProtocol
}

export async function createLlmModel(
    projectRoot: string,
    rawProviderId: string,
    rawModelId: string,
    {
        name,
        apiId,
        protocol,
    }: { name: string; apiId: string; protocol?: Protocol },
): Promise<LlmModel> {
    await requireCompany(projectRoot)
    const provider = await loadExistingLlmProvider(projectRoot, rawProviderId)
    const modelId = parseId("model", rawModelId)
    if (await hasLlmModel(projectRoot, provider.id, modelId)) {
        throw new UserError(
            `Provider "${provider.id}" already has a model "${modelId}".`,
        )
    }
    const modelConfig = parseConfig(LlmModelConfigSchema, {
        name,
        apiId,
        protocol: chooseProtocol(provider, protocol),
    })
    const model = { providerId: provider.id, id: modelId, ...modelConfig }
    await saveLlmModel(projectRoot, model)
    return model
}
