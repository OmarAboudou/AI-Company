import type { Dirent } from "node:fs"
import { readdir } from "node:fs/promises"

export async function listFolderEntries(folderPath: string): Promise<Dirent[]> {
    return readdir(folderPath, { withFileTypes: true }).catch(
        (error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") {
                return []
            }
            throw error
        },
    )
}
