import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { readConfig, readText } from "../files.ts"
import { llmcoDir } from "../project.ts"
import { type Position, PositionConfigSchema } from "./position.ts"

function positionsDir(projectRoot: string): string {
    return join(llmcoDir(projectRoot), "positions")
}

function positionPaths(projectRoot: string, id: string) {
    const dir = join(positionsDir(projectRoot), id)
    return {
        config: join(dir, "config.json"),
        description: join(dir, "description.md"),
    }
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
    const [config, description] = await Promise.all([
        readConfig(projectRoot, paths.config, PositionConfigSchema),
        readText(projectRoot, paths.description),
    ])
    return { id, ...config, description }
}

export async function listPositions(projectRoot: string): Promise<Position[]> {
    const entries = await readdir(positionsDir(projectRoot), {
        withFileTypes: true,
    }).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
            return []
        }
        throw error
    })
    const ids = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    return Promise.all(ids.map((id) => loadPosition(projectRoot, id)))
}

export async function savePosition(
    projectRoot: string,
    position: Position,
): Promise<void> {
    const { id, description, ...config } = position
    const paths = positionPaths(projectRoot, id)
    await Promise.all([
        Bun.write(paths.config, `${JSON.stringify(config, null, 4)}\n`),
        Bun.write(paths.description, description),
    ])
}
