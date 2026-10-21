import { listFolderEntries } from "./list-folder-entries.ts"

const extension = ".json"

export async function listJsonFileIds(folderPath: string): Promise<string[]> {
    const entries = await listFolderEntries(folderPath)
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
        .map((entry) => entry.name.slice(0, -extension.length))
        .sort()
}
