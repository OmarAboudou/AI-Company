import { cp } from "node:fs/promises"

export async function copyFolder(
    folderPath: string,
    copyPath: string,
): Promise<void> {
    await cp(folderPath, copyPath, {
        recursive: true,
        errorOnExist: true,
        force: false,
    })
}
