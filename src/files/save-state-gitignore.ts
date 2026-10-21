import { join } from "node:path"
import { getStateFolderPath } from "./get-state-folder-path.ts"

const gitignoreContent =
    "# Created by llmco: its runtime state stays out of git.\n*\n"

export async function saveStateGitignore(projectRoot: string): Promise<void> {
    await Bun.write(
        join(getStateFolderPath(projectRoot), ".gitignore"),
        gitignoreContent,
    )
}
