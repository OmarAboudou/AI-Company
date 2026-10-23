import { runGit } from "../git/run-git.ts"
import { UserError } from "../user-error.ts"

// The company is the repository's, wherever in it AICo runs, as git's
// commands are.
function readProjectRoot(currentFolderPath: string): string {
    try {
        const topFolderPath = runGit(currentFolderPath, [
            "rev-parse",
            "--show-toplevel",
        ])
        return topFolderPath ?? currentFolderPath
    } catch (error) {
        // Without git, the command says so once it needs it.
        if (!(error instanceof UserError)) {
            throw error
        }
        return currentFolderPath
    }
}

export const projectRoot = readProjectRoot(process.cwd())
