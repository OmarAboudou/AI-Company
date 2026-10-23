import { join } from "node:path"
import { getAicoFolderPath } from "./get-aico-folder-path.ts"

export function getStateFolderPath(projectRoot: string): string {
    return join(getAicoFolderPath(projectRoot), ".state")
}
