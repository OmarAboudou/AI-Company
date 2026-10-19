import { cp, rm } from "node:fs/promises"
import { join } from "node:path"
import { llmcoDir } from "../files/get-llmco-folder-path.ts"
import { stateDir } from "../files/get-state-folder-path.ts"
import { listSubdirectories } from "../files/list-subdirectories.ts"
import { readConfig } from "../files/read-json-file.ts"
import { readText } from "../files/read-text-file.ts"
import { writeState } from "../files/save-state.ts"
import { loadIdHistory, saveIdHistory } from "../id-history.ts"
import {
    type Position,
    PositionConfigSchema,
    type PositionState,
    PositionStateSchema,
} from "./position.ts"

function positionsDir(projectRoot: string): string {
    return join(llmcoDir(projectRoot), "positions")
}

function positionDir(projectRoot: string, id: string): string {
    return join(positionsDir(projectRoot), id)
}

function positionPaths(projectRoot: string, id: string) {
    const dir = positionDir(projectRoot, id)
    return {
        config: join(dir, "config.json"),
        description: join(dir, "description.md"),
        history: join(dir, "history.json"),
    }
}

function positionStatePath(projectRoot: string, id: string): string {
    return join(stateDir(projectRoot), "positions", `${id}.json`)
}

export async function positionExists(
    projectRoot: string,
    id: string,
): Promise<boolean> {
    return Bun.file(positionPaths(projectRoot, id).config).exists()
}

export async function loadPosition(
    projectRoot: string,
    id: string,
): Promise<Position> {
    const paths = positionPaths(projectRoot, id)
    const [config, description, history] = await Promise.all([
        readConfig(projectRoot, paths.config, PositionConfigSchema),
        readText(projectRoot, paths.description),
        loadIdHistory(projectRoot, paths.history),
    ])
    return { id, ...config, ...history, description }
}

export async function listPositions(projectRoot: string): Promise<Position[]> {
    const ids = await listSubdirectories(positionsDir(projectRoot))
    return Promise.all(ids.map((id) => loadPosition(projectRoot, id)))
}

export async function savePosition(
    projectRoot: string,
    position: Position,
): Promise<void> {
    const { id, description, createdAt, formerIds, ...config } = position
    const paths = positionPaths(projectRoot, id)
    await Promise.all([
        Bun.write(paths.config, `${JSON.stringify(config, null, 4)}\n`),
        Bun.write(paths.description, description),
        saveIdHistory(paths.history, { createdAt, formerIds }),
    ])
}

export async function deletePosition(
    projectRoot: string,
    id: string,
): Promise<void> {
    await rm(positionDir(projectRoot, id), { recursive: true })
}

export async function copyPosition(
    projectRoot: string,
    id: string,
    newId: string,
): Promise<void> {
    await cp(positionDir(projectRoot, id), positionDir(projectRoot, newId), {
        recursive: true,
        errorOnExist: true,
        force: false,
    })
}

export async function loadPositionState(
    projectRoot: string,
    id: string,
): Promise<PositionState> {
    const path = positionStatePath(projectRoot, id)
    if (!(await Bun.file(path).exists())) {
        return {}
    }
    return readConfig(projectRoot, path, PositionStateSchema)
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
    await writeState(projectRoot, positionStatePath(projectRoot, id), state)
}

export async function deletePositionState(
    projectRoot: string,
    id: string,
): Promise<void> {
    await rm(positionStatePath(projectRoot, id), { force: true })
}
