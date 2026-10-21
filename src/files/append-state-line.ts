import { appendFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { saveStateGitignore } from "./save-state-gitignore.ts"

export async function appendStateLine(
    projectRoot: string,
    path: string,
    line: object,
): Promise<void> {
    await saveStateGitignore(projectRoot)
    await mkdir(dirname(path), { recursive: true })
    await appendFile(path, `${JSON.stringify(line)}\n`)
}
