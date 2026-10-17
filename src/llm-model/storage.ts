import { join } from "node:path"
import { listSubdirectories, readConfig } from "../files.ts"
import { llmProviderDir } from "../llm-provider/storage.ts"
import { type LlmModel, LlmModelConfigSchema } from "./llm-model.ts"

function llmModelsDir(projectRoot: string, provider: string): string {
    return join(llmProviderDir(projectRoot, provider), "models")
}

function llmModelConfigPath(
    projectRoot: string,
    provider: string,
    id: string,
): string {
    return join(llmModelsDir(projectRoot, provider), id, "config.json")
}

export async function llmModelExists(
    projectRoot: string,
    provider: string,
    id: string,
): Promise<boolean> {
    return Bun.file(llmModelConfigPath(projectRoot, provider, id)).exists()
}

export async function loadLlmModel(
    projectRoot: string,
    provider: string,
    id: string,
): Promise<LlmModel> {
    const config = await readConfig(
        projectRoot,
        llmModelConfigPath(projectRoot, provider, id),
        LlmModelConfigSchema,
    )
    return { provider, id, ...config }
}

export async function listLlmModels(
    projectRoot: string,
    provider: string,
): Promise<LlmModel[]> {
    const ids = await listSubdirectories(llmModelsDir(projectRoot, provider))
    return Promise.all(ids.map((id) => loadLlmModel(projectRoot, provider, id)))
}

export async function saveLlmModel(
    projectRoot: string,
    model: LlmModel,
): Promise<void> {
    const { provider, id, ...config } = model
    await Bun.write(
        llmModelConfigPath(projectRoot, provider, id),
        `${JSON.stringify(config, null, 4)}\n`,
    )
}
