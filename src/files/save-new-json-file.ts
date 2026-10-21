import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export async function saveNewJsonFile(
    path: string,
    content: object,
): Promise<void> {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, `${JSON.stringify(content, null, 4)}\n`, {
        flag: "wx",
    })
}
