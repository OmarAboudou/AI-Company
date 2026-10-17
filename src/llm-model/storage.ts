import { join } from "node:path"
import { listSubdirectories, readConfig } from "../files.ts"
import { llmProviderDir } from "../llm-provider/storage.ts"
import { type LlmModel, LlmModelConfigSchema } from "./llm-model.ts"

function llmModelsDir(projectRoot: string, providerId: string): string {
    return join(llmProviderDir(projectRoot, providerId), "models")
}

function llmModelConfigPath(
    projectRoot: string,
    providerId: string,
    id: string,
): string {
    return join(llmModelsDir(projectRoot, providerId), id, "config.json")
}

export async function llmModelExists(
    projectRoot: string,
    providerId: string,
    id: string,
): Promise<boolean> {
    return Bun.file(llmModelConfigPath(projectRoot, providerId, id)).exists()
}

export async function loadLlmModel(
    projectRoot: string,
    providerId: string,
    id: string,
): Promise<LlmModel> {
    const config = await readConfig(
        projectRoot,
        llmModelConfigPath(projectRoot, providerId, id),
        LlmModelConfigSchema,
    )
    return { providerId, id, ...config }
}

export async function listLlmModels(
    projectRoot: string,
    providerId: string,
): Promise<LlmModel[]> {
    const ids = await listSubdirectories(llmModelsDir(projectRoot, providerId))
    return Promise.all(
        ids.map((id) => loadLlmModel(projectRoot, providerId, id)),
    )
}

export async function saveLlmModel(
    projectRoot: string,
    model: LlmModel,
): Promise<void> {
    const { providerId, id, ...config } = model
    await Bun.write(
        llmModelConfigPath(projectRoot, providerId, id),
        `${JSON.stringify(config, null, 4)}\n`,
    )
}
