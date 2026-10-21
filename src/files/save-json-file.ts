import { buildJsonFileText } from "./build-json-file-text.ts"

export async function saveJsonFile(
    path: string,
    content: object,
): Promise<void> {
    await Bun.write(path, buildJsonFileText(content))
}
