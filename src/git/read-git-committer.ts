import { UserError } from "../user-error.ts"
import { gitConfig } from "./read-git-config.ts"

export type GitCommitter = { name: string; email: string }

export function committer(projectRoot: string): GitCommitter {
    const name = gitConfig(projectRoot, "user.name")
    const email = gitConfig(projectRoot, "user.email")
    if (name === undefined || email === undefined) {
        throw new UserError(
            "Messages record who typed them, as commits do: set `git config user.name` and `git config user.email`.",
        )
    }
    return { name, email }
}
