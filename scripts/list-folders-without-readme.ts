import { readdir } from "node:fs/promises"
import { join } from "node:path"

export async function listFoldersWithoutReadme(
    parentFolderPath: string,
): Promise<string[]> {
    const entries = await readdir(parentFolderPath, { withFileTypes: true })
    const folderPaths = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(parentFolderPath, entry.name))
    const foldersWithoutReadmeByFolder = await Promise.all(
        folderPaths.map(async (folderPath) => {
            const [hasReadme, nestedFoldersWithoutReadme] = await Promise.all([
                Bun.file(join(folderPath, "README.md")).exists(),
                listFoldersWithoutReadme(folderPath),
            ])
            return hasReadme
                ? nestedFoldersWithoutReadme
                : [folderPath, ...nestedFoldersWithoutReadme]
        }),
    )
    return foldersWithoutReadmeByFolder.flat().sort()
}
