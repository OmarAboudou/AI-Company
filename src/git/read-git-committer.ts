import { UserError } from "../user-error.ts"
import { readGitConfig } from "./read-git-config.ts"

export type GitCommitter = { name: string; email: string }

export function readGitCommitter(projectRoot: string): GitCommitter {
    const name = readGitConfig(projectRoot, "user.name")
    const email = readGitConfig(projectRoot, "user.email")
    if (name === undefined || email === undefined) {
        throw new UserError(
            "Messages record who typed them, as commits do: set `git config user.name` and `git config user.email`.",
        )
    }
    return { name, email }
}
