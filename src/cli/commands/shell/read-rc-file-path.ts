import { homedir } from "node:os"
import { join } from "node:path"
import { rcFileNames, type Shell } from "./shells.ts"

export function readRcFilePath(shell: Shell): string {
    const folderPath =
        shell === "zsh" ? process.env.ZDOTDIR || homedir() : homedir()
    return join(folderPath, rcFileNames[shell])
}
