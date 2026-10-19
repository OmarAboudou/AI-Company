import { join } from "node:path"
import { getStateFolderPath } from "./get-state-folder-path.ts"

const gitignoreContent =
    "# Created by llmco: its runtime state stays out of git.\n*\n"

export async function saveState(
    projectRoot: string,
    path: string,
    state: object,
): Promise<void> {
    // The .gitignore first: git must never see a state file without it.
    await Bun.write(
        join(getStateFolderPath(projectRoot), ".gitignore"),
        gitignoreContent,
    )
    await Bun.write(path, `${JSON.stringify(state, null, 4)}\n`)
}
