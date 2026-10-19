import { readdir } from "node:fs/promises"

export async function listSubdirectories(
    folderPath: string,
): Promise<string[]> {
    const entries = await readdir(folderPath, { withFileTypes: true }).catch(
        (error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") {
                return []
            }
            throw error
        },
    )
    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
}
