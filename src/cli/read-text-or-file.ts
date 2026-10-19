import { readTextFile } from "../files/read-text-file.ts"
import { projectRoot } from "./project-root.ts"

export async function readTextOrFile<Text extends string | undefined>(
    text: Text,
    file: string | undefined,
): Promise<Text | string> {
    if (file === undefined) {
        return text
    }
    if (file === "-") {
        return Bun.stdin.text()
    }
    return readTextFile(projectRoot, file)
}
