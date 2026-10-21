import { listFolderEntries } from "./list-folder-entries.ts"

export async function listSubdirectories(
    folderPath: string,
): Promise<string[]> {
    const entries = await listFolderEntries(folderPath)
    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
}
