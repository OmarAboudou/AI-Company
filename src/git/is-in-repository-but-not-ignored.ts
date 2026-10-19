import { spawnGit } from "./spawn-git.ts"

export function isInRepositoryButNotIgnored(
    dir: string,
    path: string,
): boolean {
    return spawnGit(dir, ["check-ignore", "-q", path]).exitCode === 1
}
