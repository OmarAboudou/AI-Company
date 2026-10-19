import { spawnGit } from "./spawn-git.ts"

export function isInRepositoryButNotIgnored(
    repositoryPath: string,
    path: string,
): boolean {
    return spawnGit(repositoryPath, ["check-ignore", "-q", path]).exitCode === 1
}
