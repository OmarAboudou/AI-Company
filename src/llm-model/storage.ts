import { cp, rm } from "node:fs/promises"
import { join } from "node:path"
import { listSubdirectories, readConfig } from "../files.ts"
import { llmProviderDir } from "../llm-provider/storage.ts"
import { type LlmModel, LlmModelConfigSchema } from "./llm-model.ts"

function llmModelsDir(projectRoot: string, providerId: string): string {
    return join(llmProviderDir(projectRoot, providerId), "models")
}

function llmModelDir(
    projectRoot: string,
    providerId: string,
    id: string,
): string {
    return join(llmModelsDir(projectRoot, providerId), id)
}

function llmModelConfigPath(
    projectRoot: string,
    providerId: string,
    id: string,
): string {
    return join(llmModelDir(projectRoot, providerId, id), "config.json")
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

export async function deleteLlmModel(
    projectRoot: string,
    providerId: string,
    id: string,
): Promise<void> {
    await rm(llmModelDir(projectRoot, providerId, id), { recursive: true })
}

export async function copyLlmModel(
    projectRoot: string,
    providerId: string,
    id: string,
    newId: string,
): Promise<void> {
    await cp(
        llmModelDir(projectRoot, providerId, id),
        llmModelDir(projectRoot, providerId, newId),
        { recursive: true, errorOnExist: true, force: false },
    )
}
