import type { GitCommitter } from "./read-git-committer.ts"
import { spawnGit } from "./spawn-git.ts"

export function createGitRepository(
    folderPath: string,
    committer: GitCommitter,
): void {
    spawnGit(folderPath, ["init", "-q"])
    spawnGit(folderPath, ["config", "user.name", committer.name])
    spawnGit(folderPath, ["config", "user.email", committer.email])
}
