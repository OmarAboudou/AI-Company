import { z } from "zod"
import { UserError } from "../../user-error.ts"
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
    const validation = LlmProviderConfigSchema.safeParse({
        ...config,
        connections,
    })
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    const provider = { id, ...validation.data }
    await saveLlmProvider(projectRoot, provider)
    return provider
}
