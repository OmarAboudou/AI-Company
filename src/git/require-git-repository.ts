import { UserError } from "../user-error.ts"
import { runGit } from "./run-git.ts"

export function requireGitRepository(dir: string): void {
    if (runGit(dir, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
        throw new UserError(
            "llmco works inside a git repository. Run `git init` first.",
        )
    }
}
