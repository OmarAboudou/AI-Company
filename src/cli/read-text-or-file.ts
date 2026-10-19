import { readTextFile } from "../files/read-text-file.ts"
import { projectRoot } from "./project-root.ts"

export async function readTextOrFile<Text extends string | undefined>(
    text: Text,
    filePath: string | undefined,
): Promise<Text | string> {
    if (filePath === undefined) {
        return text
    }
    if (filePath === "-") {
        return Bun.stdin.text()
    }
    return readTextFile(projectRoot, filePath)
}
