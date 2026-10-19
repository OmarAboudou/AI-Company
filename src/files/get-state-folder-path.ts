import { join } from "node:path"
import { getLlmcoFolderPath } from "./get-llmco-folder-path.ts"

export function getStateFolderPath(projectRoot: string): string {
    return join(getLlmcoFolderPath(projectRoot), ".state")
}
