import { join } from "node:path"
import { llmcoDir } from "./get-llmco-folder-path.ts"

export function stateDir(projectRoot: string): string {
    return join(llmcoDir(projectRoot), ".state")
}
