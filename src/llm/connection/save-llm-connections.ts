import { parseConfig } from "../../parse-config.ts"
import {
    type LlmProvider,
    LlmProviderConfigSchema,
} from "../provider/schema.ts"
import { saveLlmProvider } from "../provider/storage.ts"

export async function saveLlmConnections(
    projectRoot: string,
    { id, ...config }: LlmProvider,
    connections: object,
): Promise<LlmProvider> {
    const providerConfig = parseConfig(LlmProviderConfigSchema, {
        ...config,
        connections,
    })
    const provider = { id, ...providerConfig }
    await saveLlmProvider(projectRoot, provider)
    return provider
}
