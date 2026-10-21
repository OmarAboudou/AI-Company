import { saveJsonFile } from "./save-json-file.ts"
import { saveStateGitignore } from "./save-state-gitignore.ts"

export async function saveState(
    projectRoot: string,
    path: string,
    state: object,
): Promise<void> {
    // The .gitignore first: git must never see a state file without it.
    await saveStateGitignore(projectRoot)
    await saveJsonFile(path, state)
}
