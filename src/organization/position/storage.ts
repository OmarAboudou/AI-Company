import { rm } from "node:fs/promises"
import { join } from "node:path"
import { copyFolder } from "../../files/copy-folder.ts"
import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { readTextFile } from "../../files/read-text-file.ts"
import { saveJsonFile } from "../../files/save-json-file.ts"
import { loadIdHistory, saveIdHistory } from "../../ids/id-history-storage.ts"
import {
    type Position,
    PositionConfigSchema,
    type PositionState,
    PositionStateSchema,
} from "./schema.ts"

function getPositionsFolderPath(projectRoot: string): string {
    return join(getAicoFolderPath(projectRoot), "positions")
}

function getPositionFolderPath(projectRoot: string, id: string): string {
    return join(getPositionsFolderPath(projectRoot), id)
}

function getPositionFilePaths(projectRoot: string, id: string) {
    const positionFolderPath = getPositionFolderPath(projectRoot, id)
    return {
        config: join(positionFolderPath, "config.json"),
        description: join(positionFolderPath, "description.md"),
        history: join(positionFolderPath, "history.json"),
        state: join(positionFolderPath, "state.json"),
    }
}

export async function hasPosition(
    projectRoot: string,
    id: string,
): Promise<boolean> {
    return Bun.file(getPositionFilePaths(projectRoot, id).config).exists()
}

export async function loadPosition(
    projectRoot: string,
    id: string,
): Promise<Position> {
    const paths = getPositionFilePaths(projectRoot, id)
    const [config, description, history] = await Promise.all([
        readJsonFile(projectRoot, paths.config, PositionConfigSchema),
        readTextFile(projectRoot, paths.description),
        loadIdHistory(projectRoot, paths.history),
    ])
    return { id, ...config, ...history, description }
}

export async function listPositions(projectRoot: string): Promise<Position[]> {
    const positionIds = await listSubdirectories(
        getPositionsFolderPath(projectRoot),
    )
    return Promise.all(positionIds.map((id) => loadPosition(projectRoot, id)))
}

export async function savePosition(
    projectRoot: string,
    position: Position,
): Promise<void> {
    const { id, description, createdAt, formerIds, ...config } = position
    const paths = getPositionFilePaths(projectRoot, id)
    await Promise.all([
        saveJsonFile(paths.config, config),
        Bun.write(paths.description, description),
        saveIdHistory(paths.history, { createdAt, formerIds }),
    ])
}

export async function deletePositionFolder(
    projectRoot: string,
    id: string,
): Promise<void> {
    await rm(getPositionFolderPath(projectRoot, id), { recursive: true })
}

export async function copyPositionFolder(
    projectRoot: string,
    id: string,
    newId: string,
): Promise<void> {
    await copyFolder(
        getPositionFolderPath(projectRoot, id),
        getPositionFolderPath(projectRoot, newId),
    )
}

export async function loadPositionState(
    projectRoot: string,
    id: string,
): Promise<PositionState> {
    const path = getPositionFilePaths(projectRoot, id).state
    if (!(await Bun.file(path).exists())) {
        return {}
    }
    return readJsonFile(projectRoot, path, PositionStateSchema)
}

export async function savePositionState(
    projectRoot: string,
    id: string,
    state: PositionState,
): Promise<void> {
    const path = getPositionFilePaths(projectRoot, id).state
    if (Object.values(state).every((value) => value === undefined)) {
        await rm(path, { force: true })
        return
    }
    await saveJsonFile(path, state)
}
