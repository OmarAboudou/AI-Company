import { appendFile } from "node:fs/promises"
import { UserError } from "../../../user-error.ts"
import { readRcFilePath } from "./read-rc-file-path.ts"
import type { Shell } from "./shells.ts"

export async function saveShellInitLine(shell: Shell): Promise<string> {
    const rcFilePath = readRcFilePath(shell)
    const rcFile = Bun.file(rcFilePath)
    const rcText = (await rcFile.exists()) ? await rcFile.text() : ""
    if (rcText.includes("aico shell init")) {
        throw new UserError(
            `${rcFilePath} already evaluates llmco's shell function.`,
        )
    }
    await appendFile(
        rcFilePath,
        `\n# llmco's shell function, which current-human and current-position need\neval "$(aico shell init ${shell})"\n`,
    )
    return rcFilePath
}
