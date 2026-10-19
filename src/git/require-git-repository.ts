import { UserError } from "../user-error.ts"
import { runGit } from "./run-git.ts"

export function requireGitRepository(folderPath: string): void {
    if (runGit(folderPath, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
        throw new UserError(
            "llmco works inside a git repository. Run `git init` first.",
        )
    }
}
