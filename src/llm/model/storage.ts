import { cp, rm } from "node:fs/promises"
import { join } from "node:path"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { getLlmProviderFolderPath } from "../provider/storage.ts"
import { type LlmModel, LlmModelConfigSchema } from "./schema.ts"

function getLlmModelsFolderPath(
    projectRoot: string,
    providerId: string,
): string {
    return join(getLlmProviderFolderPath(projectRoot, providerId), "models")
}

function getLlmModelFolderPath(
    projectRoot: string,
    providerId: string,
    id: string,
): string {
    return join(getLlmModelsFolderPath(projectRoot, providerId), id)
}

function getLlmModelConfigFilePath(
    projectRoot: string,
    providerId: string,
    id: string,
): string {
    return join(
        getLlmModelFolderPath(projectRoot, providerId, id),
        "config.json",
    )
}

export async function hasLlmModel(
    projectRoot: string,
    providerId: string,
    id: string,
): Promise<boolean> {
    return Bun.file(
        getLlmModelConfigFilePath(projectRoot, providerId, id),
    ).exists()
}

export async function loadLlmModel(
    projectRoot: string,
    providerId: string,
    id: string,
): Promise<LlmModel> {
    const config = await readJsonFile(
        projectRoot,
        getLlmModelConfigFilePath(projectRoot, providerId, id),
        LlmModelConfigSchema,
    )
    return { providerId, id, ...config }
}

export async function listLlmModels(
    projectRoot: string,
    providerId: string,
): Promise<LlmModel[]> {
    const modelIds = await listSubdirectories(
        getLlmModelsFolderPath(projectRoot, providerId),
    )
    return Promise.all(
        modelIds.map((id) => loadLlmModel(projectRoot, providerId, id)),
    )
}

export async function saveLlmModel(
    projectRoot: string,
    model: LlmModel,
): Promise<void> {
    const { providerId, id, ...config } = model
    await Bun.write(
        getLlmModelConfigFilePath(projectRoot, providerId, id),
        `${JSON.stringify(config, null, 4)}\n`,
    )
}

export async function deleteLlmModelFolder(
    projectRoot: string,
    providerId: string,
    id: string,
): Promise<void> {
    await rm(getLlmModelFolderPath(projectRoot, providerId, id), {
        recursive: true,
    })
}

export async function copyLlmModelFolder(
    projectRoot: string,
    providerId: string,
    id: string,
    newId: string,
): Promise<void> {
    await cp(
        getLlmModelFolderPath(projectRoot, providerId, id),
        getLlmModelFolderPath(projectRoot, providerId, newId),
        { recursive: true, errorOnExist: true, force: false },
    )
}
