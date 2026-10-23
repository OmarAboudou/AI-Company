import { saveLlmProvider } from "../provider/storage.ts"
import { saveLlmModel } from "./storage.ts"

export const exampleLlmModel = { providerId: "anthropic", modelId: "opus" }

export async function saveExampleLlmModel(projectRoot: string): Promise<void> {
    await saveLlmProvider(projectRoot, {
        id: "anthropic",
        name: "Anthropic",
        connections: {
            "anthropic-messages": { baseUrl: "https://api.anthropic.com" },
        },
    })
    await saveLlmModel(projectRoot, {
        providerId: "anthropic",
        id: "opus",
        name: "Opus",
        apiId: "claude-opus-5-5",
        protocol: "anthropic-messages",
    })
}
