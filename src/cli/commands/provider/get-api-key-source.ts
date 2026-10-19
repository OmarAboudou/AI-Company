import type { ApiKeySource } from "../../../llm/provider/schema.ts"

export function getApiKeySource(options: {
    apiKeyEnv?: string
    apiKeyFile?: string
}): ApiKeySource | undefined {
    if (options.apiKeyEnv !== undefined) {
        return { kind: "env", variable: options.apiKeyEnv }
    }
    if (options.apiKeyFile !== undefined) {
        return { kind: "file", path: options.apiKeyFile }
    }
    return undefined
}
