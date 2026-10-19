import { parseId } from "../../ids/parse-id.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { UserError } from "../../user-error.ts"
import { listLlmModels } from "../model/storage.ts"
import type { LlmProvider } from "../provider/schema.ts"
import { loadLlmProviderWithConnection } from "./load-llm-provider-with-connection.ts"
import { saveLlmConnections } from "./save-llm-connections.ts"
import type { Protocol } from "./schema.ts"

export async function deleteLlmConnection(
    projectRoot: string,
    rawProviderId: string,
    protocol: Protocol,
): Promise<LlmProvider> {
    await requireCompany(projectRoot)
    const [provider, models] = await Promise.all([
        loadLlmProviderWithConnection(projectRoot, rawProviderId, protocol),
        listLlmModels(projectRoot, parseId("provider", rawProviderId)),
    ])
    const protocolModelIds = models
        .filter((model) => model.protocol === protocol)
        .map(({ id }) => id)
    if (protocolModelIds.length > 0) {
        throw new UserError(
            `The ${protocol} connection of provider "${provider.id}" is used by models ${protocolModelIds.join(", ")}. Give them another protocol with \`llmco model update -p\`, or delete them, first.`,
        )
    }
    const remainingConnections = Object.entries(
        provider.connections ?? {},
    ).filter(([connectionProtocol]) => connectionProtocol !== protocol)
    return saveLlmConnections(
        projectRoot,
        provider,
        Object.fromEntries(remainingConnections),
    )
}
