import { cp, rm } from "node:fs/promises"
import { join } from "node:path"
import { getLlmcoFolderPath } from "../../files/get-llmco-folder-path.ts"
import { getStateFolderPath } from "../../files/get-state-folder-path.ts"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { readTextFile } from "../../files/read-text-file.ts"
import { saveState } from "../../files/save-state.ts"
import { loadIdHistory, saveIdHistory } from "../../ids/id-history-storage.ts"
import {
    type Position,
    PositionConfigSchema,
    type PositionState,
    PositionStateSchema,
} from "./schema.ts"

function getPositionsFolderPath(projectRoot: string): string {
    return join(getLlmcoFolderPath(projectRoot), "positions")
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
    }
}

function getPositionStateFilePath(projectRoot: string, id: string): string {
    return join(getStateFolderPath(projectRoot), "positions", `${id}.json`)
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
        Bun.write(paths.config, `${JSON.stringify(config, null, 4)}\n`),
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
    await cp(
        getPositionFolderPath(projectRoot, id),
        getPositionFolderPath(projectRoot, newId),
        {
            recursive: true,
            errorOnExist: true,
            force: false,
        },
    )
}

export async function loadPositionState(
    projectRoot: string,
    id: string,
): Promise<PositionState> {
    const path = getPositionStateFilePath(projectRoot, id)
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
    if (Object.values(state).every((value) => value === undefined)) {
        await deletePositionState(projectRoot, id)
        return
    }
    await saveState(
        projectRoot,
        getPositionStateFilePath(projectRoot, id),
        state,
    )
}

export async function deletePositionState(
    projectRoot: string,
    id: string,
): Promise<void> {
    await rm(getPositionStateFilePath(projectRoot, id), { force: true })
}
