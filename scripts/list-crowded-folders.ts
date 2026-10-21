import type { Dirent } from "node:fs"
import { readdir } from "node:fs/promises"
import { basename, join } from "node:path"

export type CrowdedFolder = { path: string; sourceEntryCount: number }

const maxSourceEntryCount = 15

function isSourceEntry(folderName: string, entry: Dirent): boolean {
    if (entry.isDirectory()) {
        return true
    }
    return (
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".testing.ts") &&
        entry.name !== `${folderName}.ts`
    )
}

export async function listCrowdedFolders(
    folderPath: string,
): Promise<CrowdedFolder[]> {
    const entries = await readdir(folderPath, { withFileTypes: true })
    const folderName = basename(folderPath)
    const sourceEntryCount = entries.filter((entry) =>
        isSourceEntry(folderName, entry),
    ).length
    const subfolderPaths = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(folderPath, entry.name))
    const crowdedFoldersBySubfolder = await Promise.all(
        subfolderPaths.map(listCrowdedFolders),
    )
    const crowdedFolders = crowdedFoldersBySubfolder.flat()
    return sourceEntryCount > maxSourceEntryCount
        ? [{ path: folderPath, sourceEntryCount }, ...crowdedFolders]
        : crowdedFolders
}
