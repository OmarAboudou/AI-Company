import { join } from "node:path"

export function getAicoFolderPath(projectRoot: string): string {
    return join(projectRoot, ".aico")
}
