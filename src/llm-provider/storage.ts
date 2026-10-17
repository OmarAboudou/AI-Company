import { join } from "node:path"
import { listSubdirectories, readConfig } from "../files.ts"
import { llmcoDir } from "../project.ts"
import { type LlmProvider, LlmProviderConfigSchema } from "./llm-provider.ts"

function llmProvidersDir(projectRoot: string): string {
    return join(llmcoDir(projectRoot), "llm-providers")
}

export function llmProviderDir(projectRoot: string, id: string): string {
    return join(llmProvidersDir(projectRoot), id)
}

function llmProviderConfigPath(projectRoot: string, id: string): string {
    return join(llmProviderDir(projectRoot, id), "config.json")
}

export async function llmProviderExists(
    projectRoot: string,
    id: string,
): Promise<boolean> {
    return Bun.file(llmProviderConfigPath(projectRoot, id)).exists()
}

export async function loadLlmProvider(
    projectRoot: string,
    id: string,
): Promise<LlmProvider> {
    const config = await readConfig(
        projectRoot,
        llmProviderConfigPath(projectRoot, id),
        LlmProviderConfigSchema,
    )
    return { id, ...config }
}

export async function listLlmProviders(
    projectRoot: string,
): Promise<LlmProvider[]> {
    const ids = await listSubdirectories(llmProvidersDir(projectRoot))
    return Promise.all(ids.map((id) => loadLlmProvider(projectRoot, id)))
}

export async function saveLlmProvider(
    projectRoot: string,
    provider: LlmProvider,
): Promise<void> {
    const { id, ...config } = provider
    await Bun.write(
        llmProviderConfigPath(projectRoot, id),
        `${JSON.stringify(config, null, 4)}\n`,
    )
}
