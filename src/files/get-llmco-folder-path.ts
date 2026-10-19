import { join } from "node:path"

export function getLlmcoFolderPath(projectRoot: string): string {
    return join(projectRoot, ".llmco")
}
