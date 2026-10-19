import { readdir } from "node:fs/promises"

export async function listSubdirectories(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(
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
