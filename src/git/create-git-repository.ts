import type { GitCommitter } from "./read-git-committer.ts"
import { spawnGit } from "./spawn-git.ts"

export function createGitRepository(
    dir: string,
    committer: GitCommitter,
): void {
    spawnGit(dir, ["init", "-q"])
    spawnGit(dir, ["config", "user.name", committer.name])
    spawnGit(dir, ["config", "user.email", committer.email])
}
