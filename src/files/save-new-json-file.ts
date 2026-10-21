import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { buildJsonFileText } from "./build-json-file-text.ts"

export async function saveNewJsonFile(
    path: string,
    content: object,
): Promise<void> {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, buildJsonFileText(content), { flag: "wx" })
}
