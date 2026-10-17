import { join } from "node:path"

export function llmcoDir(projectRoot: string): string {
    return join(projectRoot, ".llmco")
}
