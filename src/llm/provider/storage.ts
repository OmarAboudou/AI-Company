import { cp, rm } from "node:fs/promises"
import { join } from "node:path"
import { getLlmcoFolderPath } from "../../files/get-llmco-folder-path.ts"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { type LlmProvider, LlmProviderConfigSchema } from "./schema.ts"

function getLlmProvidersFolderPath(projectRoot: string): string {
    return join(getLlmcoFolderPath(projectRoot), "llm-providers")
}

export function getLlmProviderFolderPath(
    projectRoot: string,
    id: string,
): string {
    return join(getLlmProvidersFolderPath(projectRoot), id)
}

function getLlmProviderConfigFilePath(projectRoot: string, id: string): string {
    return join(getLlmProviderFolderPath(projectRoot, id), "config.json")
}

export async function hasLlmProvider(
    projectRoot: string,
    id: string,
): Promise<boolean> {
    return Bun.file(getLlmProviderConfigFilePath(projectRoot, id)).exists()
}

export async function loadLlmProvider(
    projectRoot: string,
    id: string,
): Promise<LlmProvider> {
    const config = await readJsonFile(
        projectRoot,
        getLlmProviderConfigFilePath(projectRoot, id),
        LlmProviderConfigSchema,
    )
    return { id, ...config }
}

export async function listLlmProviders(
    projectRoot: string,
): Promise<LlmProvider[]> {
    const providerIds = await listSubdirectories(
        getLlmProvidersFolderPath(projectRoot),
    )
    return Promise.all(
        providerIds.map((id) => loadLlmProvider(projectRoot, id)),
    )
}

export async function saveLlmProvider(
    projectRoot: string,
    provider: LlmProvider,
): Promise<void> {
    const { id, ...config } = provider
    await Bun.write(
        getLlmProviderConfigFilePath(projectRoot, id),
        `${JSON.stringify(config, null, 4)}\n`,
    )
}

export async function deleteLlmProviderFolder(
    projectRoot: string,
    id: string,
): Promise<void> {
    await rm(getLlmProviderFolderPath(projectRoot, id), { recursive: true })
}

export async function copyLlmProviderFolder(
    projectRoot: string,
    id: string,
    newId: string,
): Promise<void> {
    await cp(
        getLlmProviderFolderPath(projectRoot, id),
        getLlmProviderFolderPath(projectRoot, newId),
        { recursive: true, errorOnExist: true, force: false },
    )
}
