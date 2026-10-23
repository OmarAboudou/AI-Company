import { UserError } from "../../user-error.ts"
import { requireLlmConnection } from "../connection/require-llm-connection.ts"
import type { Connections } from "../connection/schema.ts"
import type { LlmModel } from "../model/schema.ts"
import { loadLlmModel } from "../model/storage.ts"
import { readApiKey } from "../provider/read-api-key.ts"
import type { LlmProvider } from "../provider/schema.ts"
import { loadLlmProvider } from "../provider/storage.ts"

export type AnthropicMessagesModel = {
    provider: LlmProvider
    model: LlmModel
    connection: NonNullable<Connections["anthropic-messages"]>
    apiKey: string | undefined
}

export async function loadAnthropicMessagesModel(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    { providerId, modelId }: { providerId: string; modelId: string },
): Promise<AnthropicMessagesModel> {
    const [provider, model] = await Promise.all([
        loadLlmProvider(projectRoot, providerId),
        loadLlmModel(projectRoot, providerId, modelId),
    ])
    if (model.protocol !== "anthropic-messages") {
        throw new UserError(
            `Model "${model.id}" of provider "${provider.id}" is called through ${model.protocol}, which AICo can't call yet.`,
        )
    }
    const connection = requireLlmConnection(provider, "anthropic-messages")
    const apiKey = await readApiKey(projectRoot, environment, provider)
    return { provider, model, connection, apiKey }
}
