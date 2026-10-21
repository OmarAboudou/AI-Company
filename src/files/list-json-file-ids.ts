import { readdir } from "node:fs/promises"

const extension = ".json"

export async function listJsonFileIds(folderPath: string): Promise<string[]> {
    const entries = await readdir(folderPath, { withFileTypes: true }).catch(
        (error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") {
                return []
            }
            throw error
        },
    )
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
        .map((entry) => entry.name.slice(0, -extension.length))
        .sort()
}
